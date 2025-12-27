// Dependencies
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Validator
export const validate = (schema: any,typeData: string) => (req: Request, res: Response, next: NextFunction) => {
    try {
      // Access the appropriate request body, query, or params based on route definition
      const data = req[typeData as keyof Request];
      schema.parse(data); // Perform Zod schema validation
      next(); // Proceed to the route handler if validation succeeds
    } catch (error) {
      if (error instanceof ZodError) {
        // Handle Zod validation errors with detailed messages
        res.status(400).json({message: "Datos invalidos"});
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
};