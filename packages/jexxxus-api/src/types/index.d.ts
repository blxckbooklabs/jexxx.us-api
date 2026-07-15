declare module 'fastify' {
  export interface FastifyRequest {
    userId: string;
    params: Record<string, string>;
    body: any;
  }
  
  export interface FastifyReply {
    status(code: number): FastifyReply;
    send(payload?: any): void;
  }

  export interface FastifyInstance {
    get(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>): void;
    put(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>): void;
    post(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>): void;
    delete(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>): void;
  }

  export interface FastifyPluginAsync {
    (fastify: FastifyInstance, opts?: any): Promise<void>;
  }
}