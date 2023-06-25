import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai";
import { AgentFunctionResult, AgentMessage } from "./common";

export class AgentPrompt {
    private prompt: string;
    private messages: AgentMessage[] = [];
  
    /**
     * Creates an instance of AgentPrompt.
     * 
     * @param prompt - The prompt to be used by the agent.
     * @param messages - An optional array of `AgentMessage` objects containing messages to be included in the prompt.
     */
    constructor(prompt: string, messages: AgentMessage[] = []) {
        this.prompt = prompt;
        this.messages = messages;
    }

    /**
     * This method returns the prompt string.
     * 
     * @returns A string containing the prompt.
     */
    getPrompt(): string {
        return this.prompt;
    }

    /**
     * This method returns the messages array.
     * 
     * @returns An array of `AgentMessage` objects containing the messages.
     */
    getMessages(): AgentMessage[] {
        return this.messages;
    }
  
    /**
     * This method prepares the input for the agent. Override this method if customization is necessary.
     * Creates message(s) from the input with ChatCompletionRequestMessageRoleEnum.User role.
     * 
     * @param input - The input to be prepared for the agent.
     * @param for_functions - An array of function names to be invoked in the input.
     * @returns A string(s) containing the prepared input.
     */
    protected prepareInput(input: any, for_functions:string[]): string | string[] | undefined | null  {
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
      const preparedInput = this.prepareInput(input, for_functions);
      if (preparedInput instanceof Array) {
        for (const inputStr of preparedInput) {
          res.push({
            "role": ChatCompletionRequestMessageRoleEnum.User,
            "content": inputStr
          });
        }
      } else if (preparedInput !== undefined && preparedInput !== null) {
        res.push({
          "role": ChatCompletionRequestMessageRoleEnum.User,
          "content": preparedInput
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
  
    /**
     * Adds the result of an agent function call to the agent prompt.
     * 
     * @param result - The result of the agent function call.
     * @returns The `AgentPrompt` instance with the added function result message.
     */
    public addAgentFunctionResult(result: AgentFunctionResult) {
      this.addMessage({
        "role": ChatCompletionRequestMessageRoleEnum.Assistant,
        "function_call": result
      });
      return this;
    }
  
    /**
     * Adds a function message to the agent prompt.
     * 
     * @param name - The name of the function.
     * @param message - The message to be added to the prompt.
     * @returns The `AgentPrompt` instance with the added function message.
     */
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