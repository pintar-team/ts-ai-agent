# AI Agent
AI Agent is a TypeScript library designed to leverage OpenAI's API, enabling developers to create and manage AI agents. With this library, you can seamlessly chain multiple requests and responses into a single API call. The most powerful feature of AI Agent is its ability to generate runtime type information (RTTI) for the 'function_call' feature of OpenAI's API, all thanks to TypeScript's RTTI.



[NPM](https://npmjs.com/package/ts-ai-agent) |
[Github](https://github.com/pintar-team/ts-ai-agent)

The library heavily relies on the RxJS library, allowing users to take advantage of its powerful features such as observables and operators to chain and manage responses from multiple agents, creating complex workflows and pipelines with ease.

# Function calling

AI Agent introduces an innovative approach to working with API calls. You can define functions for the AI models (gpt-3.5-turbo-0613 and gpt-4-0613) and have the model intelligently generate a JSON object containing the required arguments for those functions. You can then utilize the generated JSON to invoke those functions in your codebase.

The beauty of this approach is that these models have been fine-tuned to intelligently detect when a function should be called based on the input and respond with JSON that matches the function signature. This opens up new possibilities for creating more dynamic and responsive applications with AI at their core.

However, with the increased potential also come risks. As the models are capable of making decisions that can have real-world impacts (such as sending an email, posting something online, or making a purchase), we strongly recommend implementing user confirmation flows before carrying out such operations.

The AI Agent library has been created to make it easier and more efficient for developers to utilize these new features, with TypeScript's RTTI being central to this. The generated RTTI enables developers to create more robust and reliable code when working with the 'function_call' feature.

Explore AI Agent and see how it can enhance your OpenAI API experience.
# Setup

## Prerequisites
- TypeScript 4.8 - 5.1
- Node.js v14 or newer

# Installation
Install the necessary packages:
```
npm install typescript-rtti reflect-metadata rxjs ts-ai-agent
npm install ttypescript -D
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
import { OpenAIApi, Configuration } from "openai";
import { Agent, AgentPrompt, AgentOptions, AgentInterruptException, AgentRequestBuilder } from "../src";
import {  map, lastValueFrom } from "rxjs";

class FunctionAgent extends Agent {
    static PROMPT:string = `Agent: You are presented with a list of records. Your task is to analyze each record and select the IDs that correspond to records that are truthful and make logical sense.`;
    constructor(api: OpenAIApi, options: AgentOptions = AgentOptions.DEFAULT) {
        super(api, AgentPrompt.fromString(FunctionAgent.PROMPT), options);
        this.registerFunction(this.select_records, "select_records", "Call this function to select record IDs that are truthful");
        this.registerFunction(this.async_select_records, "async_select_records", "Call this function to select record IDs that are truthful");
    }

    //AI function
    //Arguments ids: number[] - will generate JSON schema for the input automatically
    select_records(truthful_ids: number[], untruthful_ids:number[]): number[] {
      //validate result
      for (const id of truthful_ids) {
        if (id < 0 || id > 4) {
            throw new AgentInterruptException(`Rejected ${id}`);
        }
      }
      for (const id of untruthful_ids) {
        if (id < 0 || id > 4) {
            throw new AgentInterruptException(`Rejected ${id}`);
        }
      }
      //make sure that they are not intersecting
      for (const id of truthful_ids) {
        if (untruthful_ids.includes(id)) {
            throw new AgentInterruptException(`Rejected ${id}`);
        }
      }
      return truthful_ids;
    }

    //AI function
    //You can use async functions as well
    async async_select_records(truthful: number[], untruthful:number[]): Promise<number[]> {
        return this.select_records(truthful, untruthful);
    }
}

async function test() {
  const api = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
  }));
  const agent = new FunctionAgent(api, AgentOptions.DEFAULT);
  const sample_records = [
      {id: 1, text: 'The moon is made of cheese'},
      {id: 2, text: 'The moon is made of rock'},
      {id: 3, text: 'The moon is made of bacteria'},
      {id: 4, text: 'The moon orbits the earth'},
  ]
  try {
      const pipe = AgentRequestBuilder.create<number[]>(agent).function('async_select_records')
                                      .request(sample_records)
                                      .pipe(map(res => res.value))
                                      .pipe(map(res => sample_records.filter(record => res.includes(record.id)).map(s => s.text)))
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

