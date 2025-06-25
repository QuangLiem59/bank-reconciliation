// import { RequestPhase } from './timing.interfaces';

// export function TimedController(name?: string) {
//   return function (target: any) {
//     // Save the original constructor
//     const originalCtor = target;

//     // Create a new constructor function that wraps the original one
//     function TimedConstructor(...args: any[]) {
//       const instance = new originalCtor(...args);
//       return instance;
//     }

//     // Copy prototype methods
//     TimedConstructor.prototype = originalCtor.prototype;

//     // Add timing to handle method if it exists
//     if (TimedConstructor.prototype.handle) {
//       const originalHandle = TimedConstructor.prototype.handle;

//       TimedConstructor.prototype.handle = async function (...args: any[]) {
//         const req = args[0]?.switchToHttp?.()?.getRequest?.();
//         const controllerName = name || target.name;

//         if (req?.timing) {
//           req.timing.markTiming(
//             `Controller: ${controllerName}`,
//             RequestPhase.CONTROLLER,
//           );
//         }

//         const result = await originalHandle.apply(this, args);

//         if (req?.timing) {
//           req.timing.markTiming(
//             `Controller: ${controllerName} (completed)`,
//             RequestPhase.CONTROLLER,
//           );
//         }

//         return result;
//       };
//     }

//     return TimedConstructor;
//   };
// }

// export function TimedRoute(name?: string) {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     const originalMethod = descriptor.value;

//     descriptor.value = async function (...args: any[]) {
//       const req = args[0]?.switchToHttp?.()?.getRequest?.();
//       const routeName = name || propertyKey;

//       if (req?.timing) {
//         req.timing.markTiming(`Route: ${routeName}`, RequestPhase.CONTROLLER);
//       }

//       const result = await originalMethod.apply(this, args);

//       if (req?.timing) {
//         req.timing.markTiming(
//           `Route: ${routeName} (completed)`,
//           RequestPhase.CONTROLLER,
//         );
//       }

//       return result;
//     };

//     return descriptor;
//   };
// }

// export function TimedService(name?: string) {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     const originalMethod = descriptor.value;

//     descriptor.value = async function (...args: any[]) {
//       // Try to find a request object in the arguments
//       const req = args.find((arg) => arg?.timing)?.timing
//         ? args.find((arg) => arg?.timing)
//         : null;

//       const serviceName = name || `${target.constructor.name}.${propertyKey}`;

//       if (req?.timing) {
//         req.timing.markTiming(`Service: ${serviceName}`, RequestPhase.SERVICE);
//       }

//       const result = await originalMethod.apply(this, args);

//       if (req?.timing) {
//         req.timing.markTiming(
//           `Service: ${serviceName} (completed)`,
//           RequestPhase.SERVICE,
//         );
//       }

//       return result;
//     };

//     return descriptor;
//   };
// }
