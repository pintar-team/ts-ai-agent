
import "reflect-metadata";
import {
  ChatCompletionFunctions,
  OpenAIApi,
} from "openai";

import { ReflectedTypeRef, ReflectedArrayRef, ReflectedEnumRef, reflect, ReflectedObjectRef } from "typescript-rtti";

import { AgentFunctionResult, AgentOptions } from "./common";
import { AgentPrompt } from "./prompt";



/**
 * Represents a function call that can be executed by an AI agent.
 */
export class AgentFunctionCall implements ChatCompletionFunctions {
  func: Function;
  name: string;
  description?: string;
  parameters?: any;

  constructor(func: Function, name: string) {
    if (typeof func !== "function") {
      throw new TypeError(`Expected func to be a function, but got ${typeof func}`);
    }
    this.func = func;
    this.name = name;
  }

  public toChatComletion(): ChatCompletionFunctions {
    const result = {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    } as ChatCompletionFunctions;
    return result;
  }

/**
 * Returns a JSON schema property object based on the given `ReflectedTypeRef`.
 * 
 * @param ref - The `ReflectedTypeRef` to create a JSON schema property object from.
 * @param functionName - The name of the function that the `ReflectedTypeRef` belongs to.
 * @returns A JSON schema property object representing the given `ReflectedTypeRef`.
 * @throws Error if the `ReflectedTypeRef` is of an unknown type.
 */
  public static propFromType(ref: ReflectedTypeRef, functionName: string = ""): any {
    const kind = ref.kind;
    const prop = {
      type: kind
    } as any;
    if (kind === 'array') {
      const arrayRef = ref as ReflectedArrayRef;
      if (arrayRef) {
        prop.items = AgentFunctionCall.propFromType(arrayRef.elementType);
      }
    } else if (kind === "enum") {
      const enumRef = ref as ReflectedEnumRef;
      if (enumRef) {
        prop.type = "string";
        prop.enum = enumRef.values.map((v) => v.name);
      }
    } else if (kind === "object") {
      const objRef = ref as ReflectedObjectRef;
      if (objRef) {
        prop.properties = {};
        prop.required = [];
        for (const p of objRef.members) {
          prop.properties[p.name] = AgentFunctionCall.propFromType(p.type);
          if (!p.isOptional) {
            prop.required.push(p.name);
          }
        }
      }
    } else if (kind === "class") {
      if (ref.toString() === "class Number") {
        prop.type = "number";
      } else if (ref.toString() === "class String") {
        prop.type = "string";
      } else if (ref.toString() === "class Boolean") {
        prop.type = "boolean";
      } else {
        throw new Error(`Unknown class ${ref.toString()}`);
      }
    } else {
      throw new Error(`Unknown type ${ref.toString()} in function ${functionName}`);
    }
    return prop;
  }

/**
 * Creates an `AgentFunctionCall` object from a given function, name, and optional description.
 * 
 * @param func - The function to create an `AgentFunctionCall` object from.
 * @param name - The name of the function.
 * @param description - An optional description of the function.
 * @returns An `AgentFunctionCall` object representing the given function.
 * @throws TypeError if `func` is not a function.
 */
  public static fromFunction(func: Function, name:string, description?:string): AgentFunctionCall {
    if (typeof func !== "function") {
      throw new TypeError(`Expected func to be a function, but got ${typeof func}`);
    }
    const rf = reflect(func);
    const fc = new AgentFunctionCall(func, name);
    if (description) {
      fc.description = description;
    }
    if (rf.parameters.length > 0) {
        fc.parameters = {
            type: "object",
            properties: {},
            required: [],
        } as any;
        for (const p of rf.parameters) {
            const prop = AgentFunctionCall.propFromType(p.type, name);
            fc.parameters.properties[p.name] = prop;
            if (!p.isOptional) {
                fc.parameters.required.push(p.name);
            }
        }
    }
    return fc;
  }
}




/**
 * The `AgentInterruptException` class represents an exception that can be thrown by an agent to interrupt its execution.
 * 
 * @class
 * @extends Error
 */
export class AgentInterruptException extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}


export class AgentApiError extends Error {
  public error: any;
  constructor(error: any) {
    super(error.message);
    this.error = error;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentResult<T> {
  public value: T;
  public function_result?: AgentFunctionResult;
  public constructor(value: T, result?: AgentFunctionResult) {
    this.value = value;
    this.function_result = result;
  }
}

/**
 * The `Agent` class represents an agent that can generate text using the OpenAI API.
 * 
 * @class
 */
export class Agent {
    private api: OpenAIApi;
    private options: AgentOptions;
    private prompt: AgentPrompt;
    protected functionCalls: {[key: string]: AgentFunctionCall} = {};


    /**
     * Creates a new instance of the Agent class.
     * 
     * @param {OpenAIApi} api - The OpenAI API instance to use for generating text.
     * @param {AgentPrompt} prompt - The prompt to use for generating text.
     * @param {AgentOptions} options - The options to use for generating text.
     * @param {...AgentFunctionCall[]} func - The functions to register for the agent to call.
     */
    protected constructor(api: OpenAIApi, prompt: AgentPrompt, options: AgentOptions, ...func: AgentFunctionCall[]) {
      this.api = api;
      this.prompt = prompt;
      this.options = options;
      for (const f of func) {
        this.functionCalls[f.name] = f
      }
    }

    /**
     * Registers a function for the agent to call.
     * 
     * @param {Function} func - The function to register.
     * @param {string} name - The name to register the function under.
     * @param {string} [description] - An optional description of the function.
     */
    protected registerFunction(func: Function, name: string, description?: string): void {
      this.functionCalls[name] = AgentFunctionCall.fromFunction(func, name, description);
      //console.log(`Registered function ${name}: ${JSON.stringify(this.functionCalls[name])}`);
    }

    /**
     * Returns an array of `ChatCompletionFunctions` representing the registered functions for the agent to call.
     * 
     * @returns An array of `ChatCompletionFunctions`.
     */
    getFunctionCalls(): ChatCompletionFunctions[] {
      return Object.values(this.functionCalls).map((f: AgentFunctionCall) => f.toChatComletion());
    }

    /**
     * Returns an array of the names of the registered functions for the agent to call.
     * 
     * @returns An array of the names of the registered functions.
     * */
    getFunctionNames(): string[] {
      return Object.keys(this.functionCalls);
    }

    /**
     * Returns the Options used by the agent for generating text.
     * 
     * @returns {AgentOptions} - The options used by the agent.
     * */
    getOptions(): AgentOptions {
      return this.options;
    }

    /**
     * Returns the OpenAI API instance used by the agent for generating text.
     * 
     * @returns {OpenAIApi} - The OpenAI API instance used by the agent.
     * */
    getApi(): OpenAIApi {
      return this.api;
    }


    /**
     * Returns the prompt used by the agent for generating text.
     * 
     * @returns {AgentPrompt} - The prompt used by the agent.
     */
    getPrompt(): AgentPrompt {
      return this.prompt;
    }
  

    /**
     * Calls the specified function with the given arguments.
     * 
     * @param {string} name - The name of the function to call.
     * @param {...any} args - The arguments to pass to the function.
     * @returns The result of the function call.
     * @throws {Error} If the function name is unknown or if the wrong number of arguments is provided.
     */
    private call(name: string, ...args: any[]): any {
      const fc = this.functionCalls[name];
      if (!fc) {
        throw new Error(`Unknown function ${name}`);
      }
      const argNames = fc.parameters?.required || [];
      if (argNames.length !== args.length) {
        throw new Error(`Wrong number of arguments for ${name}, expected ${argNames.length} got ${args.length}`);
      }
      return fc.func.bind(this)(...args)
    }


    protected processTextResult<T>(text: string, for_functions: string[]): AgentResult<T> {
      const isFunctionCall = for_functions.length > 0;
      if (!isFunctionCall) {
        return new AgentResult<T>(text as T, null);
      }
      return null
    }


    /**
     * Requests any number of completions from the agent, using the specified functions and prompt.
     * 
     * @param {AgentPrompt} prompt - The prompt to use for generating completions.
     * @param {string[]} for_functions - The functions to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<T>>} - A promise that resolves to the generated completions.
     */
    async requestAnyWith<T>(prompt: AgentPrompt, for_functions: string[], input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<T>[]> {
      const isFunctionCall = for_functions.length > 0;
      if (required === undefined) {
        required = 1;
      }
      if (required > n) {
        throw new Error(`required ${required} > n ${n}`);
      }
      if (min !== undefined) {
        if (required > min) {
          throw new Error(`required ${required} > min ${min}`);
        }
        if (min > n) {
          throw new Error(`min ${min} > n ${n}`);
        }
      }
      const results: AgentResult<T>[] = [];
      try {
        const args = {
          ...this.options,
          n: n,
          messages: prompt.prepareMessages(input, for_functions),
          functions: this.getFunctionCalls().filter((f: ChatCompletionFunctions) => for_functions.includes(f.name))
        }
        if (max_tokens !== undefined) {
          args.max_tokens = max_tokens;
        }
        delete args.model_size;
        if (args.functions.length === 0) {
          delete args.functions;
        }
        if (args.messages.length === 0) {
          throw new Error(`No messages`);
        }
        const { data } = await this.api.createChatCompletion(args)
        let error:Error = null;
        let processed = 0;
        for (const choice of data.choices) {
          if (choice.message.function_call !== undefined) {
            try {
              const args = JSON.parse(choice.message.function_call.arguments);
              //console.log(`Calling ${choice.message.function_call.name}(${JSON.stringify(args, null, 2)})`);
              let res = null;
              try {
                res = this.call(choice.message.function_call.name, ...Object.values(args));
                if (res instanceof Promise) {
                  res = await res;
                }
              } catch (e) {
                if (e instanceof AgentInterruptException) {
                  throw e;
                }
                continue;
              }
              results.push(new AgentResult<T>(res, choice.message.function_call));
              processed++;
              if (min !== undefined && processed >= min) {
                break;
              }
            } catch (e) {
              if (e instanceof AgentInterruptException) {
                throw e;
              }
              error = e;
            }
          } else {
            const res = this.processTextResult<T>(choice.message.content, for_functions);
            if (res) {
              results.push(res);
              processed++;
              if (min !== undefined && processed >= min) {
                break;
              }
            }
          }
        }
        if (processed < required) {
          if (error) {
            throw error;
          } else {
            throw new Error("No function call found");
          }
        }
      } catch (e) {
        if (e instanceof AgentInterruptException) {
          throw e;
        }
        if (e?.response?.data?.error) {
          throw new AgentApiError(e.response.data.error);
        }
        throw new Error(`Failed to generate completions: ${e.message}`);
      }
      return results;
    }

    /**
     * Requests any number of completions from the agent, using the specified functions.
     * 
     * @param {string[]} for_functions - The functions to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<T>>} - A promise that resolves to the generated completions.
     */
    async requestAny<T>(for_functions: string[], input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<T>[]> {
      return this.requestAnyWith(this.prompt, for_functions, input, n, min, required);
    }

    /**
     * Requests a specific number of completions from the agent, using all available functions.
     * 
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<T>>} - A promise that resolves to the generated completions.
     */
    async request<T>(input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<T>[]> {
      return this.requestAny(Object.keys(this.functionCalls), input, n, min, required);
    }

    /**
     * Requests a specific number of completions from the agent, using the specified prompt and all available functions.
     * 
     * @param {AgentPrompt} prompt - The prompt to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<T>>} - A promise that resolves to the generated completions.
     */
    async requestWith<T>(prompt: AgentPrompt, input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<T>[]> {
      return this.requestAnyWith(prompt, Object.keys(this.functionCalls), input, n, min, required);
    }

    /**
     * Requests a specific number of completions from the agent, using the specified function.
     * 
     * @param {string} func - The function to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<T>>} - A promise that resolves to the generated completions.
     */
    async requestFunction<T>(func: string, input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<T>[]> {
      return this.requestAny([func], input, n, min, required);
    }

    /**
     * Requests a specific number of completions from the agent, using the specified prompt and function.
     * 
     * @param {AgentPrompt} prompt - The prompt to use for generating completions.
     * @param {string} func - The function to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<T>>} - A promise that resolves to the generated completions.
     */
    async requestFunctionWith<T>(prompt: AgentPrompt, func: string, input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<T>[]> {
      return this.requestAnyWith(prompt, [func], input, n, min, required);
    }


    /**
     * Requests a specific number of text completions from the agent, without using functions.
     * 
     * @param {AgentPrompt} prompt - The prompt to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Promise<AgentResult<string>>} - A promise that resolves to the generated completions as strings.
     */
    async requestTextWith(prompt: AgentPrompt, input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<string>[]> {
      return this.requestAnyWith<string>(prompt, [], input, n, min, required);
    }


    /**
     * Requests a specific number of text completions from the agent, without using functions.
     * 
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @param {number} [max_tokens] - The maximum number of tokens to generate.
     * @returns {Observable<AgentResult<string>>} - A promise that resolves to the generated completions as strings.
     */
    async requestText(input: any, n: number, min?: number, required?: number, max_tokens?:number): Promise<AgentResult<string>[]> {
      return this.requestAny<string>([], input, n, min, required);
    }
}





