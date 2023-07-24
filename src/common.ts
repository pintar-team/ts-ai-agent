
import {
  ChatCompletionRequestMessageRoleEnum,
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageFunctionCall,
} from "openai";

/**
 * Enum containing the available OpenAI models.
 */
  export enum Models {
    GPT_3_5_TURBO = "gpt-3.5-turbo-0613", //0613 has function call api
    GPT_4 = "gpt-4-0613", //0613 has function call api
    GPT_3_5_TURBO_16K = 'gpt-3.5-turbo-16k-0613' //0613 has function call api
  }


  const model_sizes = {
    [Models.GPT_3_5_TURBO]: 4096,
    [Models.GPT_4]: 8192,
    [Models.GPT_3_5_TURBO_16K]: 16384
  }
  
  /**
   * Represents the options that can be passed to an instance of the `Agent` class.
   */
  export class AgentOptions {
    public model: string = Models.GPT_3_5_TURBO; 
    public temperature: number = 0.8;
    public top_p: number = 0.9;
    public max_tokens: number = 2048;
    public model_size: number = model_sizes[this.model];

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

    /**
     * The default AgentOptions object with long settings.
     */
    public static DEFAULT_LONG = new AgentOptions(0.8, 0.9, 4096, Models.GPT_3_5_TURBO_16K);

    /**
     * An AgentOptions object with predictable strong settings.
     */
    public static PREDICTABLE_LONG = new AgentOptions(0, 1, 2048, Models.GPT_3_5_TURBO_16K)
    
    /**
     * An AgentOptions object with creative strong settings.
     */
    public static CREATIVE_LONG = new AgentOptions(0.8, 0.9, 2048, Models.GPT_3_5_TURBO_16K)
    
    /**
     * An AgentOptions object with conservative strong settings.
     */
    public static CONSERVATIVE_LONG = new AgentOptions(0.2, 1, 2048, Models.GPT_3_5_TURBO_16K)

    /**
     * An AgentOptions object with exploratory strong settings.
     */
    public static EXPLORATORY_LONG = new AgentOptions(0.9, 0.5, 2048, Models.GPT_3_5_TURBO_16K)
    
    /**
     * An AgentOptions object with verbose strong settings.
     */
    public static VERBOSE_LONG = new AgentOptions(0.5, 0.5, 4096, Models.GPT_3_5_TURBO_16K)

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
      this.model_size = model_sizes[this.model];
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
  
  /**
   * Represents the result of a function call executed by an AI agent.
   */
  export class AgentFunctionResult implements ChatCompletionRequestMessageFunctionCall {
    name?: string;
    arguments?: string;
  }
  
  
  /**
   * Represents a message sent to an AI agent for completion.
   */
  export class AgentMessage implements ChatCompletionRequestMessage {
    role: ChatCompletionRequestMessageRoleEnum =
      ChatCompletionRequestMessageRoleEnum.System;
    content?: string;
    name?: string;
    function_call?: AgentFunctionResult;
  }