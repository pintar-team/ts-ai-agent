# AI Agent
The AI Agent is a TypeScript library for constructing and utilizing AI agents with OpenAI's API. This library lets you chain multiple requests and responses into a single request and utilize TypeScript's RTTI (Run-time Type Information) to generate type information for the 'function_call' feature of the OpenAI API.

[NPM](https://npmjs.com/package/ts-ai-agent) |
[Github](https://github.com/pintar-team/ts-ai-agent)

# Function calling
In an API call, you can define functions for the models gpt-3.5-turbo-0613 and gpt-4-0613 and the model intelligently generates a JSON object containing arguments for those functions. This allows you to use the generated JSON to call those functions in your code.

Note: These models are fine-tuned to detect when a function should be called based on the input and respond with JSON that adheres to the function signature. Given the potential risks, we recommend building in user confirmation flows before taking world-impacting actions on behalf of users (e.g., sending emails, posting online, making purchases, etc.).

# Setup

## Prerequisites
- TypeScript 4.8 - 5.1
- Node.js v14 or newer

# Installation
Install the necessary packages:
```
npm install typescript-rtti reflect-metadata
npm install ttypescript -D
npm install ts-ai-agent
```

Set up tsconfig.json to use the transformer:
```jsonc
// tsconfig.json
"compilerOptions": {
    "plugins": [{ "transform": "typescript-rtti/dist/transformer" }]
}
```

Update your build script in package.json to use ttsc instead of tsc:

```jsonc
// package.json
{
    "scripts": {
        "build": "ttsc -b"
    }
}
```

Lastly, import reflect-metadata and Agent at the start of your application:
```typescript
import "reflect-metadata";
import { Agent } from "ts-ai-agent";
```

## **ts-node**
You can also use ts-node, just pass `-C ttypescript` to make sure ts-node uses typescript compiler which respects compiler transforms.

# Usage

Here are examples showcasing the AI Agent's capabilities.

## Simple example:
This simple example involves an AI agent tasked with generating and explaining a sentence about the moon and bacteria. It also includes error handling for each step.
```typescript

import "reflect-metadata";

import { map, mergeMap, toArray, lastValueFrom, catchError, tap } from "rxjs";

import { OpenAIApi, Configuration } from "openai";

import { Agent, AgentPrompt, AgentOptions, AgentInterruptException, AgentRequestBuilder } from "./agent";


class TaskAgent extends Agent {
  static PROMPT:string = 'Agent: Perform a given task';
  constructor(api: OpenAIApi, options: AgentOptions = AgentOptions.DEFAULT) {
    super(api, AgentPrompt.fromString(TaskAgent.PROMPT), options);
  }
}
  
  
async function test() {
  const api = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }));
  const agent = new TaskAgent(api, AgentOptions.DEFAULT);
  try {
    const pipe = AgentRequestBuilder.create<string>(agent).n(2).request('Write a sentence about the moon and bacteria')
      .pipe(
        tap(res => console.log(`Step: 1: ${res.value}`)),
        mergeMap(res => AgentRequestBuilder.create<string>(agent).request(`Explain what it is about?: ${res.value}`)),
        catchError(error => {
          console.error(`Error: ${error}`);
          throw error;
        }),
        tap(res => console.log(`Step: 2: ${res.value}`)),
        mergeMap(res => AgentRequestBuilder.create<string>(agent).request(`Make a conclusion from: ${res.value}`)),
        catchError(error => {
          console.error(`Error: ${error}`);
          throw error;
        }),
        tap(res => console.log(`Step: 3: ${res.value}`)),
        map(res => res.value),
        toArray()
      );
    
    const res = await lastValueFrom(pipe);
    console.log(JSON.stringify(res, null, 2));

    return res;
  } catch (error) {
    console.error(`Error occurred in pipeline: ${error}`);
    // Here you can handle how your function reacts to an error in the pipeline.
    // You could decide to return a default value, re-throw the error, etc.
    throw error;
  }
}
```


## Example with a function call
In this example, the AI agent is tasked with selecting truthful records from a given list.
```typescript

import "reflect-metadata";

import { map, mergeMap, toArray, lastValueFrom, catchError, tap } from "rxjs";

import { OpenAIApi, Configuration } from "openai";

import { Agent, AgentPrompt, AgentOptions, AgentInterruptException, AgentRequestBuilder } from "./agent";


class FunctionAgent extends Agent {
  static PROMPT:string = 'Agent: Select only truthful records from the list of records provided.';
  constructor(api: OpenAIApi, options: AgentOptions = AgentOptions.DEFAULT) {
    super(api, AgentPrompt.fromString(FunctionAgent.PROMPT), options);
    this.registerFunction(this.truthful_records, "truthful_records", "Call this function to select truthful records");
  }

  //AI function
  //Arguments ids: number[] - will generate JSON schema for the input automatically
  truthful_records(ids: number[]): number[] {
    //validate result
    for (const id of ids) {
      if (id < 0 || id > 4) {
        throw new AgentInterruptException(`Rejected ${id}`);
      }
    }
    return ids;
  }
}
  
  
export async function test() {
  const api = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }));
  const agent = new FunctionAgent(api, AgentOptions.DEFAULT_STRONG);
  const sample_records = [
    {id: 1, text: 'The moon is made of cheese'},
    {id: 2, text: 'The moon is made of rock'},
    {id: 3, text: 'The moon is made of bacteria'},
    {id: 4, text: 'The moon orbits the earth'},
  ]
  try {
    const pipe = AgentRequestBuilder.create<number[]>(agent).function('truthful_records')
                                    .request(sample_records)
                                    .pipe(map(res => res.value));
    const res = await lastValueFrom(pipe);
    console.log(JSON.stringify(res, null, 2));
    return res;
  } catch (error) {
    console.error(`Error occurred in pipeline: ${error}`);
    // Here you can handle how your function reacts to an error in the pipeline.
    // You could decide to return a default value, re-throw the error, etc.
    throw error;
  }
}
```

