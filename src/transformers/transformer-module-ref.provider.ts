import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * A singleton service that provides access to the NestJS ModuleRef
 * This allows transformers to access repositories and services without modifying their constructors
 */
@Injectable()
export class TransformerModuleRefProvider implements OnModuleInit {
  private static instance: TransformerModuleRefProvider;
  private static moduleRef: ModuleRef;

  constructor(private readonly moduleReference: ModuleRef) {
    TransformerModuleRefProvider.instance = this;
  }

  onModuleInit() {
    TransformerModuleRefProvider.moduleRef = this.moduleReference;
  }

  /**
   * Get a reference to the ModuleRef
   */
  static getModuleRef(): ModuleRef {
    return TransformerModuleRefProvider.moduleRef;
  }

  /**
   * Get a service or repository from the module registry
   * @param token The injection token (service class, string, or symbol)
   * @param options Options for module resolution
   * @returns The requested provider instance
   */
  static get<T>(token: any, options?: { strict?: boolean }): T {
    const moduleRef = this.getModuleRef();
    if (!moduleRef) {
      console.warn('ModuleRef is not available in transformer');
      return null;
    }

    try {
      return moduleRef.get<T>(token, options || { strict: false });
    } catch (error) {
      console.error(`Failed to get provider for token: ${token}`, error);
      return null;
    }
  }
}
