## setup

```
% git clone https://github.com/furuya02/amazon-bedrock-agents-calendar-registration.git
% cd amazon-bedrock-agents-calendar-registration
% npm i
% cd lambda/agent-calendar-function; npm i; cd ../..
```

## CDKデプロイ

```
% export AWS_DEFAULT_REGION=us-east-1
% npx cdk diff
% npx cdk deploy
```

## 削除


```
% cd amazon-bedrock-agents-calendar-registration
% npm i
% npx cdk destroy
```

## ブログ

詳しくは、下記のブログをご参照ください。
