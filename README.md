
[NPM](https://npmjs.com/package/ts-ai-agent) |
[Github](https://github.com/pintar-team/ts-ai-agent)

# AI Agent

Typescript library for creating AI agents for OpenAI's artificial intelligence API.

Allows to chain multiple requests and responses into a single request.

Uses TypeScript RTTI to generate type information 'function_call' OpenAI API feature.

# Setup

Prerequisites
- Typescript 4.8 - 5.1
- Node.js v14 or newer (when using Node.js)

Installation

```
npm install typescript-rtti reflect-metadata
npm install ttypescript -D
npm install ts-ai-agent
```

Setting up `tsconfig.json`
```jsonc
// tsconfig.json
"compilerOptions": {
    "plugins": [{ "transform": "typescript-rtti/dist/transformer" }]
}
```

In order for the transformer to run during your build process, you must use `ttsc` instead of `tsc` (or use one of the case specific solutions below).

```jsonc
// package.json
{
    "scripts": {
        "build": "ttsc -b"
    }
}
```

The type information is emitted using `reflect-metadata`. You'll need to import it as early in your application as
possible and ensure that it is imported only once.

```typescript
import "reflect-metadata";
import { Agent } from "ts-ai-agent";
```

## **ts-node**
You can also use ts-node, just pass `-C ttypescript` to make sure ts-node uses typescript compiler which respects compiler transforms.

# Usage

## Simple example:

```typescript

import "reflect-metadata";

import { map, mergeMap, toArray, lastValueFrom, catchError, tap } from "rxjs";

import { OpenAIApi, Configuration } from "openai";

import { Agent, AgentPrompt, AgentOptions, AgentInterruptException, AgentRequestBuilder } from "./agent";


class TaskAgent extends Agent {
  static PROMPT:string = 'Agent: Perform a given task';
  constructor(api: OpenAIApi, options: AgentOptions = AgentOptions.DEFAULT) {
    super(api, AgentPrompt.fromString(SimpleTaskAgent.PROMPT), options);
  }
}
  
  
async function test() {
  const api = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }));
  const agent = new SimpleTaskAgent(api, AgentOptions.DEFAULT);
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

