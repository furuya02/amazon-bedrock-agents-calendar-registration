#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AgentCalendarStack } from "../lib/agent-calendar-stack";

const app = new cdk.App();
new AgentCalendarStack(app, "AgentCalendarStack", {});
