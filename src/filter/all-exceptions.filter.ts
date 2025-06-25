import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status and message for the response
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;

      const exceptionResponse = exception.getResponse();

      // Handle validation errors
      if (status === HttpStatus.BAD_REQUEST || status === 422) {
        message = 'Validation error';

        if (
          typeof exceptionResponse === 'object' &&
          'message' in exceptionResponse
        ) {
          if (Array.isArray(exceptionResponse.message)) {
            errors = this.formatValidationErrors(
              exceptionResponse.message as ValidationError[],
            );
          } else {
            errors = exceptionResponse.message;
          }
        }
      } else {
        message = exception.message || 'An error occurred';
      }

      // Customize message for 5xx errors in production
      if (status >= 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
      }
    }

    // Set values in response.locals for logging
    if (!response.locals) {
      response.locals = {};
    }
    response.locals.errMsg = message;

    if (response?.status) {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: message,
        errors: errors || null,
      });
    }
  }

  private formatValidationErrors(errors: ValidationError[]): any {
    return errors.map((error) => {
      if (typeof error === 'string') return error;
      return {
        property: error.property,
        constraints: error.constraints || {},
        children: error.children
          ? this.formatValidationErrors(error.children)
          : [],
        value: error.value,
      };
    });
  }
}
