import { TypeOrmModuleOptions } from '@nestjs/typeorm';

console.log(process.env);

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cafeteria_del_caos',
  autoLoadEntities: true,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
};
