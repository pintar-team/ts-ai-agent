import { Observable } from "rxjs";
import { Agent, AgentResult } from "./agent";
import { AgentFunctionResult } from "./common";
import { AgentPrompt } from "./prompt";

/**
 * A builder class for creating requests to an AI agent.
 * 
 * @template T - The type of the generated completions.
 * @usageNotes AgentRequestBuilder.create<string>(agent).n(4).function('rate').request("Hello World").subscribe((result) => { ... });
 */
export class AgentRequestBuilder<T> {
    private agent: Agent;
    private _prompt: AgentPrompt;
  
    private _functions: string[] = [];
    private _n: number = 1;
    private _min?: number;
    private _required?: number;
    private _max_tokens?: number;
  
    /**
     * Creates a new instance of AgentRequestBuilder.
     * 
     * @param {Agent} agent - The agent to use for generating completions.
     * @param {boolean} [all_functions=true] - Whether to use all available functions for generating completions.
     */
    constructor(agent: Agent, all_functions: boolean = true) {
      this.agent = agent;
      this._prompt = agent.getPrompt().copy();
      if (all_functions) {
        this._functions = agent.getFunctionNames();
      }
    }
  
    /**
     * Creates a new instance of AgentRequestBuilder for the specified agent.
     * 
     * @template T - The type of the generated completions.
     * @param {Agent} agent - The agent to use for generating completions.
     * @returns {AgentRequestBuilder<T>} - A new instance of AgentRequestBuilder.
     */
    public static create<T>(agent: Agent) : AgentRequestBuilder<T> {
      return new AgentRequestBuilder<T>(agent);
    }
  
    
    /**
     * Sets the prompt to use for generating completions.
     * 
     * @param {AgentPrompt} prompt - The prompt to use for generating completions.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public prompt(prompt: AgentPrompt): AgentRequestBuilder<T> {
      this._prompt = prompt.copy();
      return this;
    }
  
  
    /**
     * Sets the number of completions to generate for the request.
     * 
     * @param {number} n - The number of completions to generate.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public n(n: number): AgentRequestBuilder<T> {
      this._n = n;
      return this;
    }
  
    /**
     * Sets the minimum number of completions to generate for the request.
     * 
     * @param {number} min - The minimum number of completions to generate.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public min(min: number): AgentRequestBuilder<T> {
      this._min = min;
      return this;
    }
  
    /**
    * Sets the number of completions that are required for the request to be considered successful.
    * 
    * @param {number} required - The number of completions required.
    * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
    */
    public required(required: number): AgentRequestBuilder<T> {
      this._required = required;
      return this;
    }


    /**
     * Sets the maximum number of tokens to generate for each completion.
     * 
     * @param {number} max_tokens - The maximum number of tokens to generate for each completion.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public max_tokens(max_tokens: number): AgentRequestBuilder<T> {
      this._max_tokens = max_tokens;
      return this;
    }
  
  
    /**
     * Sets the number of tries to generate completions for the request.
     * 
     * @param {number} tries - The number of tries to generate completions.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public withTries(tries: number): AgentRequestBuilder<T> {
      this._n = tries;
      this._min = 1;
      this._required = 1;
      return this;
    }
  
    /**
     * Sets the functions to use for generating completions.
     * 
     * @param {string[]} functions - The functions to use for generating completions.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public functions(functions: string[]): AgentRequestBuilder<T> {
      this._functions = functions;
      return this;
    }
  
  
    /**
     * Sets the function to use for generating completions.
     * 
     * @param {string} func - The function to use for generating completions.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public function(func: string): AgentRequestBuilder<T> {
      this._functions = [func];
      return this;
    }
  
    /**
     * Sets all available functions to use for generating completions.
     * 
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public allFunctions(): AgentRequestBuilder<T> {
      this._functions = this.agent.getFunctionNames();
      return this;
    }
  
    /**
     * Adds a message from the user to the prompt.
     * 
     * @param {string} message - The message to add to the prompt.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public addUserMessage(message: string): AgentRequestBuilder<T> {
      this._prompt = this._prompt.addUserMessage(message);
      return this;
    }
  
    /**
     * Adds a message from the agent to the prompt.
     * 
     * @param {string} message - The message to add to the prompt.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public addAgentMessage(message: string): AgentRequestBuilder<T> {
      this._prompt = this._prompt.addAgentMessage(message);
      return this;
    }
  
    /**
     * Adds a message to the prompt for a specific function.
     * 
     * @param {string} name - The name of the function.
     * @param {string} message - The message to add to the prompt.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public addFunctionMessage(name: string, message: string): AgentRequestBuilder<T> {
      this._prompt = this._prompt.addFunctionMessage(name, message);
      return this;
    }
  
    /**
     * Adds the result of an agent function to the prompt.
     * 
     * @param {AgentFunctionResult} result - The result of the agent function.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     */
    public addAgentFunctionResult(result: AgentFunctionResult) : AgentRequestBuilder<T> {
      this._prompt = this._prompt.addAgentFunctionResult(result);
      return this;
    }
  
  
    /**
     * Sets the placeholders in the prompt to the specified values.
     * 
     * @param {Object} placeholders - An object containing the placeholder keys and their corresponding values.
     * @returns {AgentRequestBuilder<T>} - The current instance of AgentRequestBuilder.
     * @example
     * // Sets the placeholder '{{name}}' to 'John'.
     * builder.set({ name: 'John' });
     */
    public set(placeholders: { [key: string]: string }) : AgentRequestBuilder<T> {
      this._prompt = this._prompt.set(placeholders);
      return this;
    }
  
  
    /**
     * Sends a request to the agent with the specified input and returns an Observable that emits the result.
     * 
     * @param {any} input - The input to send to the agent.
     * @returns {Observable<AgentResult<T>>} - An Observable that emits the result of the request.
     */
    public request(input: any): Observable<AgentResult<T>> {
      return new Observable<AgentResult<T>>(observer => {
        this.agent.requestAnyWith<T>(this._prompt, this._functions, input, this._n, this._min, this._required, this._max_tokens).then(results => {
          results.forEach(result => observer.next(result));
          observer.complete();
        }).catch(error => {
          observer.error(error);
        });
      });
    }

    /**
     * Sends a request to the agent with the specified input and returns an Observable that emits an array of all results.
     * 
     * @param {any} input - The input to send to the agent.
     * @returns {Observable<AgentResult<T>[]>} - An Observable that emits an array of all results of the request.
     */
    public requestAll(input: any): Observable<AgentResult<T>[]> {
        return new Observable<AgentResult<T>[]>(observer => {
            this.agent.requestAnyWith<T>(this._prompt, this._functions, input, this._n, this._min, this._required, this._max_tokens).then(results => {
              observer.next(results);
              observer.complete();
            }).catch(error => {
              observer.error(error);
            });
        });
    }

    /**
     * Sends a request to the agent with the specified input and returns a Promise that resolves to an array of all results.
     * 
     * @param {any} input - The input to send to the agent.
     * @returns {Promise<AgentResult<T>[]>} - A Promise that resolves to an array of all results of the request.
     */
    public async requestPromise(input: any): Promise<AgentResult<T>[]> {
        return this.agent.requestAnyWith<T>(this._prompt, this._functions, input, this._n, this._min, this._required, this._max_tokens);
    }
  }