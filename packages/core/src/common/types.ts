/**
 * Core types for the browser override framework
 */

export interface AppConfig {
  name: string;
  urlPattern: string | RegExp;
  selectors: {
    promptInput?: string;
    submitButton?: string;
    attachmentButton?: string | string[];
    conversationId?: string;
    responseContainer?: string;
    responseText?: string;
  };
  interceptors: {
    prompt?: boolean;
    attachment?: boolean;
    analytics?: boolean;
    response?: boolean;
    apiMode?: "graphql" | "fetch";
  };
  analyticsPatterns?: string[];
}

export interface CapturedPrompt {
  text: string;
  conversationId?: string;
  timestamp: number;
  url: string;
}

export interface PromptInterceptor {
  capture: (input: string, conversationId?: string) => void;
  modify: (input: string) => string;
  record: (prompt: CapturedPrompt) => void;
}

export interface AttachmentBlocker {
  hide: () => void;
  observe: () => void;
}

export interface AnalyticsBlocker {
  block: (url: string | URL) => boolean;
  intercept: () => void;
}

export interface ResponseModifier {
  processResponse: () => void;
}

export interface FrameworkOptions {
  config: AppConfig;
  storageKey?: string;
  enableLogging?: boolean;
}

