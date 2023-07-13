import "reflect-metadata";

import { map, mergeMap, toArray, lastValueFrom, catchError, tap } from "rxjs";

import { OpenAIApi, Configuration } from "openai";

import { Agent, AgentInterruptException } from "./agent";
import { AgentPrompt } from "./prompt";
import { AgentOptions } from "./common";
import { AgentRequestBuilder } from "./agent-request";

class SimpleTaskAgent extends Agent {
    static PROMPT:string = `Agent: Perform a given task and submit your output using the provided function.
Objective: Your objective is to accurately complete the assigned task and submit the output using the specified function. The task details will be provided separately.
Instructions:
1. Read the task instructions carefully and perform the required actions accordingly.
2. Once you have completed the task, use the provided function to submit your output.
3. Ensure that your output is formatted correctly to comply with the original input and output format.
4. Remember to accurately parse the output to maintain the structure for correct script functioning.
`;
  constructor(api: OpenAIApi, options: AgentOptions = AgentOptions.DEFAULT) {
    super(api, AgentPrompt.fromString(SimpleTaskAgent.PROMPT), options);
    //this.registerFunction(this.submit, "submit", "Call this function to submit the result of the task");
    //this.registerFunction(this.reject, "reject", "Call this function if you dont want to perform the task");
  }


  //Ai function
  public submit(output_of_the_task: string): string {
    //validate if needed
    return output_of_the_task;
  }

  //Ai function
  public reject(result: string): string {
    throw new AgentInterruptException(`Rejected ${result}`);
  }
}
  
  
async function test() {
  const api = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }));
  const agent = new SimpleTaskAgent(api, AgentOptions.VERBOSE_LONG);
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