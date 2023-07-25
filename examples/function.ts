import { OpenAIApi, Configuration } from "openai";
import { Agent, AgentPrompt, AgentOptions, AgentInterruptException, AgentRequestBuilder, AgentResult } from "../src";
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


export async function test() {
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

if (require.main === module) {
    test();
}