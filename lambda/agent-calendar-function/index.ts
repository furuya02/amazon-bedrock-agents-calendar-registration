import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
const region = "us-east-1";

async function convertDateStr(dateStr: string): Promise<string | undefined> {
  const client = new BedrockRuntimeClient({ region: region });
  try {
    const today = new Date().toLocaleDateString();
    const userMessage = `本日は、${today}です。${dateStr}の年月日を教えて下さい。レスポンスの形式は、YYYY-MM-DDの形式で、年月日のみを返してください`;
    console.log(`userMessage: ${userMessage}`);
    const command = new ConverseCommand({
      modelId,
      messages: [
        {
          role: "user",
          content: [{ text: userMessage }],
        },
      ],
      inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });
    const response = await client.send(command);

    return response.output!.message!.content![0].text;
  } catch (err) {
    console.log(`ERROR: Can't invoke '${modelId}'. Reason: ${err}`);
  }
  return undefined;
}

// paramsにeventのparametersをセットする（params自体にコピーされることに注意が必要）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setParams(params: any, event: any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event["parameters"].forEach((param: any) => {
    const key = param["name"] as keyof typeof params;
    // eslint-disable-next-line no-prototype-builtins
    if (params.hasOwnProperty(key)) {
      params[key] = param["value"];
    }
  });
  console.log(`params:${JSON.stringify(params)}`);
  return params;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = async function (event: any) {
  console.log(event);

  let body = "unknown";

  if (event["function"] === "createDatestr") {
    const params: { dateStr: string } = { dateStr: "" };
    setParams(params, event);

    // YYYY.MM.DD 形式の日付文字列に変換する
    const dateStr = await convertDateStr(params.dateStr);
    if (dateStr) {
      body = dateStr;
    }
  } else if (event["function"] === "writeCalender") {
    const params: { dateStr: string; title: string } = { dateStr: "", title: "" };
    setParams(params, event);
    // 日付 params.dateStr と タイトル params.title を使ってカレンダー登録処理を行う
    body = "OK";
  }

  // レスポンス
  const response = {
    messageVersion: "1.0",
    response: {
      actionGroup: event["actionGroup"],
      function: event["function"],
      functionResponse: {
        responseBody: {
          TEXT: {
            body: body,
          },
        },
      },
    },
    sessionAttributes: event["sessionAttributes"],
    promptSessionAttributes: event["promptSessionAttributes"],
  };
  console.log(`response:${JSON.stringify(response)}`);
  return response;
};
