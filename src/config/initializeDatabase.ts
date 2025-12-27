import { TypeOrmClientFactory } from "../Contexts/Shared/infrastructure/typeorm/TypeOrmClientFactory";
import { databaseConfigProps } from "./Database";
import { environment } from "./Constants";

export async function initializeDatabase(): Promise<void> {
  try {
    console.log("Initializing database schema...");
    
    const client = await TypeOrmClientFactory.createClient("company", databaseConfigProps);
    
    // The TypeORM client will automatically create tables due to synchronize: true
    console.log("Database schema initialized successfully");
    
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    throw error;
  }
}
