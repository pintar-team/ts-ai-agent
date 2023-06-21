
import "reflect-metadata";
import {
  ChatCompletionRequestMessageRoleEnum,
  ChatCompletionRequestMessage,
  ChatCompletionFunctions,
  ChatCompletionRequestMessageFunctionCall,
  OpenAIApi,
} from "openai";
import { ReflectedTypeRef, ReflectedArrayRef, ReflectedEnumRef, reflect, ReflectedObjectRef } from "typescript-rtti";

//import rxjs
import { Observable } from "rxjs";

export enum Models {
  GPT_3_5_TURBO = "gpt-3.5-turbo-0613", //0613 has function call api
  GPT_4 = "gpt-4-0613", //0613 has function call api
}

export class AgentOptions {
  model: string = Models.GPT_3_5_TURBO; 
  temperature: number = 0.8;
  top_p: number = 0.9;
  max_tokens: number = 2048;

  /**
   * The default AgentOptions object.
   */
  public static DEFAULT = new AgentOptions();

  /**
   * An AgentOptions object with predictable settings.
   */
  public static PREDICTABLE = new AgentOptions(0, 1, 2048);
  
  /**
   * An AgentOptions object with creative settings.
   */
  public static CREATIVE = new AgentOptions(0.8, 0.9, 2048);
  
  /**
   * An AgentOptions object with conservative settings.
   */
  public static CONSERVATIVE = new AgentOptions(0.2, 1, 2048);

  /**
   * An AgentOptions object with exploratory settings.
   */
  public static EXPLORATORY = new AgentOptions(0.9, 0.5, 2048);
  
  /**
   * An AgentOptions object with verbose settings.
   */
  public static VERBOSE = new AgentOptions(0.5, 0.5, 4096);

  /**
   * An AgentOptions object with predictable strong settings.
   */
  public static PREDICTABLE_STRONG = new AgentOptions(0, 1, 2048, Models.GPT_4)
  
  /**
   * An AgentOptions object with creative strong settings.
   */
  public static CREATIVE_STRONG = new AgentOptions(0.8, 0.9, 2048, Models.GPT_4)
  
  /**
   * An AgentOptions object with conservative strong settings.
   */
  public static CONSERVATIVE_STRONG = new AgentOptions(0.2, 1, 2048, Models.GPT_4)

  /**
   * An AgentOptions object with exploratory strong settings.
   */
  public static EXPLORATORY_STRONG = new AgentOptions(0.9, 0.5, 2048, Models.GPT_4)
  
  /**
   * An AgentOptions object with verbose strong settings.
   */
  public static VERBOSE_STRONG = new AgentOptions(0.5, 0.5, 4096, Models.GPT_4)

  /**
   * The default AgentOptions object with strong settings.
   */
  public static DEFAULT_STRONG = new AgentOptions(0.8, 0.9, 2048, Models.GPT_4);

  constructor(
    temperature: number = 0.8,
    top_p: number = 0.9,
    max_tokens: number = 2048,
    model: string = Models.GPT_3_5_TURBO
  ) {
    this.temperature = temperature;
    this.top_p = top_p;
    this.max_tokens = max_tokens;
    this.model = model;
  }

  copy(): AgentOptions {
    return new AgentOptions(
      this.temperature,
      this.top_p,
      this.max_tokens,
      this.model
    );
  }

  adjust_temperature(temperature: number): AgentOptions {
    const options = this.copy();
    options.temperature = temperature;
    return options;
  }

  adjust_top_p(top_p: number): AgentOptions {
    const options = this.copy();
    options.top_p = top_p;
    return options;
  }

  adjust_max_tokens(max_tokens: number): AgentOptions {
    const options = this.copy();
    options.max_tokens = max_tokens;
    return options;
  }

  adjust_model(model: string): AgentOptions {
    const options = this.copy();
    options.model = model;
    return options;
  }
}


export class AgentFunctionResult implements ChatCompletionRequestMessageFunctionCall {
  name?: string;
  arguments?: string;
}

//AgentMessage class
export class AgentMessage implements ChatCompletionRequestMessage {
  role: ChatCompletionRequestMessageRoleEnum =
    ChatCompletionRequestMessageRoleEnum.System;
  content?: string;
  name?: string;
  function_call?: AgentFunctionResult;
}

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

export class AgentPrompt {
  private prompt: string;
  private messages: AgentMessage[] = [];

  constructor(prompt: string, messages: AgentMessage[] = []) {
    this.prompt = prompt;
    this.messages = messages;
  }

  /**
   * This method prepares the input for the agent. Override this method if customization is necessary.
   * 
   * @param input - The input to be prepared for the agent.
   * @param for_functions - An array of function names to be invoked in the input.
   * @returns A string containing the prepared input.
   */
  protected prepareInput(input: any, for_functions:string[]): string | undefined | null {
    if (input === undefined || input === null) {
      return '';
    } else if (typeof input === 'object') {
      return JSON.stringify(input);
    }
    return String(input);
  }

  /**
   * This method prepares the prompt for the agent. Override this method if customization is necessary.
   * 
   * @param prompt - The prompt to be prepared for the agent.
   * @param input - The input to be prepared for the agent.
   * @param for_functions - An array of function names to be invoked in the input.
   * @returns A string containing the prepared prompt.
   */
  protected preparePrompt(prompt: string, input: any, for_functions:string[]): string | undefined | null {
    return prompt;
  }

  /**
   * This method prepares the terminal prompt for the agent. Override this method if customization is necessary.
   * 
   * @param input - The input to be prepared for the agent.
   * @param for_functions - An array of function names to be invoked in the input.
   * @returns A string containing the prepared terminal prompt.
   */
  protected prepareTerminalPrompt(input: any, for_functions:string[]): string | undefined | null {
    if (for_functions.length > 0) {
      return "The next message should exclusively invoke the function.";
    } else {
      return null;
    }
  }

  /**
   * This method prepares the messages for the agent. Override this method if customization is necessary.
   * 
   * @param input - The input to be prepared for the agent.
   * @param for_functions - An array of function names to be invoked in the input.
   * @returns An array of `ChatCompletionRequestMessage` objects containing the prepared messages.
   */
  public prepareMessages(input: any, for_functions:string[]): ChatCompletionRequestMessage[] {
    const res:ChatCompletionRequestMessage[] = [{
      "role": ChatCompletionRequestMessageRoleEnum.System,
      "content": this.preparePrompt(this.prompt, input, for_functions)
    }]
    const inputStr = this.prepareInput(input, for_functions);
    if (inputStr !== undefined && inputStr !== null) {
      res.push({
        "role": ChatCompletionRequestMessageRoleEnum.User,
        "content": inputStr
      });
    }
    for (const message of this.messages) {
      res.push(message);
    }
    const terminalPrompt = this.prepareTerminalPrompt(input, for_functions);
    if (terminalPrompt !== undefined && terminalPrompt !== null) {
      res.push({
        "role": ChatCompletionRequestMessageRoleEnum.System,
        "content": terminalPrompt
      });
    }
    return res;
  }


  /**
   * Adds a message to the agent prompt.
   * 
   * @param message - The message to be added to the prompt.
   * @returns The `AgentPrompt` instance with the added message.
   */
  public addMessage(message: AgentMessage): AgentPrompt {
    this.messages.push(message);
    return this;
  }

  /**
   * Adds a user message to the agent prompt.
   * 
   * @param message - The message to be added to the prompt.
   * @returns The `AgentPrompt` instance with the added message.
   */
  public addUserMessage(message: string): AgentPrompt {
    this.addMessage({
      "role": ChatCompletionRequestMessageRoleEnum.User,
      "content": message
    });
    return this;
  }

  /**
   * Adds a system message to the agent prompt.
   * 
   * @param message - The message to be added to the prompt.
   * @returns The `AgentPrompt` instance with the added message.
   */
  public addSystemMessage(message: string): AgentPrompt {
    this.addMessage({
      "role": ChatCompletionRequestMessageRoleEnum.System,
      "content": message
    });
    return this;
  }

  /**
   * Adds an agent message to the agent prompt.
   * 
   * @param message - The message to be added to the prompt.
   * @returns The `AgentPrompt` instance with the added message.
   */
  public addAgentMessage(message: string): AgentPrompt {
    this.addMessage({
      "role": ChatCompletionRequestMessageRoleEnum.Assistant,
      "content": message
    });
    return this;
  }

  public addAgentFunctionResult(result: AgentFunctionResult) {
    this.addMessage({
      "role": ChatCompletionRequestMessageRoleEnum.Assistant,
      "function_call": result
    });
    return this;
  }


  public addFunctionMessage(name: string, message: string): AgentPrompt {
    this.addMessage({
      "role": ChatCompletionRequestMessageRoleEnum.Function,
      "content": message,
      "name": name
    });
    return this;
  }

  /**
   * Clears all messages from the agent prompt.
   * 
   * @returns The `AgentPrompt` instance with all messages cleared.
   */
  public clearMessages(): AgentPrompt {
    this.messages = [];
    return this;
  }


  /**
   * Replaces placeholders in the prompt string with their corresponding values and returns a new `AgentPrompt` instance.
   * 
   * @param placeholders - An object containing key-value pairs of placeholders and their corresponding values.
   * @returns A new `AgentPrompt` instance with placeholders replaced by their corresponding values.
   */
  public set(placeholders: {[key: string]: string}): AgentPrompt {
    const prompt = AgentPrompt.setPlaceholders(this.prompt, placeholders);
    return new AgentPrompt(prompt, this.messages);
  }

  /**
   * Returns an array of all the placeholders in the prompt string.
   * 
   * @returns An array of all the placeholders in the prompt string.
   */
  public listPlaceholders(): string[] {
    const regex = /{{(.*?)}}/g;
    const placeholders = [];
    let match: any[];
    while ((match = regex.exec(this.prompt)) !== null) {
      placeholders.push(match[1]);
    }
    //remove duplicates
    return [...new Set(placeholders)];
  }

  /**
   * This method creates a new `AgentPrompt` instance with the same prompt as the current instance.
   * 
   * @returns A new `AgentPrompt` instance with the same prompt as the current instance.
   */
  public copy(): AgentPrompt {
    return new AgentPrompt(this.prompt, this.messages);
  }

  /**
   * Replaces placeholders in a given prompt string with their corresponding values.
   * 
   * @param prompt - The prompt string containing placeholders.
   * @param placeholders - An object containing key-value pairs of placeholders and their corresponding values.
   * @returns The prompt string with placeholders replaced by their corresponding values.
   */
  public static setPlaceholders(prompt: string, placeholders: {[key: string]: string}): string {
    //placeholder format: {{placeholder}}
    for (const [key, value] of Object.entries(placeholders)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return prompt;
  }

  /**
   * This static method creates an AgentPrompt from a given string.
   * 
   * @param prompt - The prompt string.
   * @returns A new `AgentPrompt` instance.
   */
  public static fromString(prompt: string): AgentPrompt {
    return new AgentPrompt(prompt);
  }

  
  /**
   * This static method creates an AgentPrompt from a file.
   * 
   * @param filename - The name of the file containing the prompt string.
   * @returns A new `AgentPrompt` instance.
   */
  public static fromFile(filename: string): AgentPrompt {
    const fs = require("fs");
    return new AgentPrompt(fs.readFileSync(filename, "utf8"));
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
      return fc.func(...args);
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
     * @returns {Observable<AgentResult<T>>} - An observable that emits the generated completions.
     */
    requestAnyWith<T>(prompt: AgentPrompt, for_functions: string[], input: any, n: number, min?: number, required?: number): Observable<AgentResult<T>> {
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
      return new Observable(subscriber => {
        (async () => {
          try {
            const args = {
              ...this.options,
              n: n,
              messages: prompt.prepareMessages(input, for_functions),
              functions: this.getFunctionCalls().filter((f: ChatCompletionFunctions) => for_functions.includes(f.name))
            }
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
                  subscriber.next(new AgentResult<T>(res, choice.message.function_call));
                  processed++;
                  if (min !== undefined && processed >= min) {
                    break;
                  }
                } catch (e) {
                  if (e instanceof AgentInterruptException) {
                    subscriber.error(e);
                    subscriber.complete();
                    return;
                  }
                  error = e;
                }
              } else if (!isFunctionCall) {
                subscriber.next(new AgentResult<T>(choice.message.content as T, null));
                processed++;
                if (min !== undefined && processed >= min) {
                  break;
                }
              }
            }
            if (processed < required) {
              if (error) {
                subscriber.error(error);
              } else {
                subscriber.error(new Error("No function call found"));
              }
            }
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
            subscriber.complete();
          }
        })();
      });
    }

    /**
     * Requests any number of completions from the agent, using the specified functions.
     * 
     * @param {string[]} for_functions - The functions to use for generating completions.
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @returns {Observable<T>} - An observable that emits the generated completions.
     */
    requestAny<T>(for_functions: string[], input: any, n: number, min?: number, required?: number): Observable<AgentResult<T>> {
      return this.requestAnyWith(this.prompt, for_functions, input, n, min, required);
    }

    /**
     * Requests a specific number of completions from the agent, using all available functions.
     * 
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @returns {Observable<T>} - An observable that emits the generated completions.
     */
    request<T>(input: any, n: number, min?: number, required?: number): Observable<AgentResult<T>> {
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
     * @returns {Observable<T>} - An observable that emits the generated completions.
     */
    requestWith<T>(prompt: AgentPrompt, input: any, n: number, min?: number, required?: number): Observable<AgentResult<T>> {
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
     * @returns {Observable<T>} - An observable that emits the generated completions.
     */
    requestFunction<T>(func: string, input: any, n: number, min?: number, required?: number): Observable<AgentResult<T>> {
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
     * @returns {Observable<T>} - An observable that emits the generated completions.
     */
    requestFunctionWith<T>(prompt: AgentPrompt, func: string, input: any, n: number, min?: number, required?: number): Observable<AgentResult<T>> {
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
     * @returns {Observable<AgentResult<string>>} - An observable that emits the generated completions as strings.
     */
    requestTextWith(prompt: AgentPrompt, input: any, n: number, min?: number, required?: number): Observable<AgentResult<string>> {
      return this.requestAnyWith(prompt, [], input, n, min, required);
    }


    /**
     * Requests a specific number of text completions from the agent, without using functions.
     * 
     * @param {any} input - The input to use for generating completions.
     * @param {number} n - The number of completions to generate.
     * @param {number} [min] - The minimum number of completions to generate.
     * @param {number} [required] - The number of completions required to complete the request.
     * @returns {Observable<AgentResult<string>>} - An observable that emits the generated completions as strings.
     */
    requestText(input: any, n: number, min?: number, required?: number): Observable<AgentResult<string>> {
      return this.requestAny([], input, n, min, required);
    }
}


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
    return this.agent.requestAnyWith(this._prompt, this._functions, input, this._n, this._min, this._required);
  }
}


