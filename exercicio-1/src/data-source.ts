import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Configuração do DataSource para o TypeORM CLI.
 *
 * Este arquivo é usado EXCLUSIVAMENTE pelo CLI do TypeORM para
 * gerar e rodar migrations. O NestJS usa sua própria configuração
 * via TypeOrmModule.forRoot() no app.module.ts.
 *
 * Mantemos ambos apontando para as mesmas variáveis de ambiente
 * para garantir consistência.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '784512',
  database: process.env.DB_DATABASE || 'uds',
  entities: [__dirname + '/cobranca/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
