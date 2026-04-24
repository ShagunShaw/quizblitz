import winston from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';

const transports = [];

// 1. Always log to Console/File (useful in both Dev and Prod)
transports.push(
  new winston.transports.File({ filename: 'combined.log' })
);

// 2. Only log to Axiom if in Production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new AxiomTransport({
      dataset: process.env.AXIOM_DATASET_NAME,
      token: process.env.AXIOM_INGEST_TOKEN,
    })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: transports,
});

export default logger;