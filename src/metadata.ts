import { DEPENDENCIES } from './constant.js'
import { Lifecycle } from './lifecycle.js'
import { Constructor, ServiceIdentifier } from './identifier.js'

export interface DependenceMetadata {
  field: string | symbol
  serviceIdentifier: ServiceIdentifier
  setter: (object: unknown, value: unknown) => void
}

export interface ContextMetadata {
  [DEPENDENCIES]: ServiceMetadata
}

export interface ServiceMetadata {
  lifecycle: Lifecycle
  dependencies: DependenceMetadata[]
}

export function checkAndInitContextMetadata(context: ClassDecoratorContext | ClassAccessorDecoratorContext | ClassFieldDecoratorContext) {
  if (typeof (<ContextMetadata><unknown>context.metadata)[DEPENDENCIES] !== 'object') {
    (<ContextMetadata><unknown>context.metadata)[DEPENDENCIES] = {
      dependencies: [],
      lifecycle: Lifecycle.transient
    }
  }
}

export function getClassMetadata(target: Constructor<unknown>): ServiceMetadata {
  if (typeof (<any>target)[Symbol.metadata]?.[DEPENDENCIES] === 'object') {
    return (<any>target)[Symbol.metadata][DEPENDENCIES]
  }
  return {
    dependencies: [],
    lifecycle: Lifecycle.transient
  }
}

