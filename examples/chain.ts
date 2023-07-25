import "reflect-metadata";

import { map, mergeMap, toArray, lastValueFrom, catchError, tap } from "rxjs";

import { OpenAIApi, Configuration } from "openai";

import { Agent, AgentPrompt, AgentOptions, AgentInterruptException, AgentRequestBuilder, AgentResult } from "../src";


class TaskAgent extends Agent {
  static PROMPT:string = 'Agent: Perform a given task';
  constructor(api: OpenAIApi, options: AgentOptions = AgentOptions.DEFAULT) {
    super(api, AgentPrompt.fromString(TaskAgent.PROMPT), options);
  }

  protected override processTextResult<T>(text: string, for_functions: string[]): AgentResult<T> {
    console.log(`Processing text result: ${text}`);
    return super.processTextResult<T>(text, for_functions);
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

if (require.main === module) {
    test();
}