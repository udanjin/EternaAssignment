import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || message;

        // format class-validator errors nicely
        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          errors = {};
          for (const msg of resp.message) {
            if (typeof msg === 'string') {
              const [field, ...rest] = msg.split(' ');
              errors[field] = rest.join(' ') || msg;
            } else if (msg.property && msg.constraints) {
              errors[msg.property] = Object.values(msg.constraints)[0] as string;
            }
          }
        }

        if (resp.errors) {
          errors = resp.errors;
        }
      }
    } else {
      console.error('Unhandled Exception:', exception);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      ...(errors && { errors }),
    });
  }
}
