import fs = require("fs");
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
//import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
//import { aws_s3 as s3 } from "aws-cdk-lib";
import { aws_bedrock as bedrock } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";

export class AgentCalendarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const foundationModel = this.node.tryGetContext("foundationModel");
    const projectName = this.node.tryGetContext("projectName");

    //const bucketName = `${projectName}-${this.account}`;
    const functionName = `${projectName}-function`;
    ///////////////////////////////////////////////////////////////////////
    // Lambda
    ///////////////////////////////////////////////////////////////////////
    const reservationFunctionRole = new iam.Role(this, "LambdaFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
      inlinePolicies: {
        inlinePolicie: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["bedrock:InvokeModel"],
              resources: [`*`],
            }),
          ],
        }),
      },
    });

    const reservationFunction = new lambda.Function(this, "LambdaFunction", {
      functionName: functionName,
      code: lambda.Code.fromAsset(`lambda/${functionName}`),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(30),
      role: reservationFunctionRole,
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        TZ: "Asia/Tokyo",
      },
    });

    ///////////////////////////////////////////////////////////////////////
    // Actions for Amazon Berock
    ///////////////////////////////////////////////////////////////////////
    const agentsRole = new iam.Role(this, "AgentRole", {
      roleName: `${projectName}_agents_role`,
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      inlinePolicies: {
        agentPoliciy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["bedrock:InvokeModel"],
              resources: [`arn:aws:bedrock:${this.region}::foundation-model/${foundationModel}`],
            }),
          ],
        }),
      },
    });

    const instructionText = new TextDecoder("utf-8").decode(fs.readFileSync("assets/instruction.txt"));
    const bedrockAgents = new bedrock.CfnAgent(this, "BedrockAgents", {
      agentName: projectName,
      description: projectName,
      agentResourceRoleArn: agentsRole.roleArn,
      foundationModel: foundationModel,
      instruction: instructionText,
      actionGroups: [
        {
          actionGroupName: "actionGroup",
          description: "日付変換及び。カレンダー登録",
          actionGroupState: "ENABLED",
          functionSchema: {
            functions: [
              {
                name: "createDatestr",
                description: "日付変換",
                parameters: {
                  dateStr: {
                    type: "string",
                    description: "日付文字列",
                    required: true,
                  },
                },
              },
              {
                name: "writeCalender",
                description: "カレンダー登録",
                parameters: {
                  dateStr: {
                    type: "string",
                    description: "日付文字列",
                    required: true,
                  },
                  title: {
                    type: "string",
                    description: "タイトル",
                    required: true,
                  },
                },
              },
            ],
          },
          actionGroupExecutor: {
            lambda: reservationFunction.functionArn,
          },
        },
      ],
    });

    ///////////////////////////////////////////////////////////////////////
    // Resource-Based Policy Statements
    ///////////////////////////////////////////////////////////////////////
    const principal = new iam.ServicePrincipal("bedrock.amazonaws.com", {
      conditions: {
        ArnLike: {
          "aws:SourceArn": bedrockAgents.attrAgentArn,
        },
      },
    });
    reservationFunction.grantInvoke(principal);
  }
}
