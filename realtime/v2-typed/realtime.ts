


export type RealtimeEventCallback<T> = (data:T) => void;
export type RealtimeGuard<T> =  (context:RealtimeApplicationContext<T>)=> boolean;
export type RealtimeRoute<T> = (context:RealtimeApplicationContext<T>)=> void;
export type RealtimePayloadFormatterFunction<T,U> = (data:U)=> T;

export class RealtimeRouteDefinition<T>{
    route!: RealtimeRoute<T>;
    guards?: RealtimeGuard<T>[];
}

// Adapter interface for different realtime implementations (e.g., WebSocket, SSE, etc.)
export interface RealtimeAdapter{
    connect():Promise<void>;
    disconnect():Promise<void>;
    onMessage():void;
    subscribe(type:string,callback:()=>void,channelName:string):void;
}

export interface Realtime{
    on<T>(eventName:string, callback:RealtimeEventCallback<T>):void;
    off<T>(eventName:string, callback:RealtimeEventCallback<T>):void;
}

export class RealtimeApplicationContext<T> {

    private applicationIdentifier!:string;
    private applicationContext!:T;

    emit<U>(eventName: string, data: U): void{

    }

    getContext(): T {
        return this.applicationContext;
    }

    setContext(context: T): void {
        this.applicationContext = context;
    }

    getApplicationIdentifier(): string {
        return this.applicationIdentifier;
    }
    setApplicationIdentifier(identifier: string): void {
        this.applicationIdentifier = identifier;
    }
}

export interface RealtimePayloadFormatter<T,U>{
    format(data:U): T;
}

export class RealtimConfiguration<
    ApplicationContextDefintion,
    RealtimeRawContent
>{
    adapter!: RealtimeAdapter;
    payloadFormatter!: RealtimePayloadFormatter<ApplicationContextDefintion,RealtimeRawContent> | RealtimePayloadFormatterFunction<ApplicationRealtimeContext,RealtimeRawContent>;
    routes!: Array<RealtimeRouteDefinition<ApplicationRealtimeContext>>;
    middlewares?:Array<string>;
}


export function createRealtime<
    ApplicationContextDefintion,
    RealtimeRawContent
>(
    config:RealtimConfiguration<ApplicationContextDefintion,RealtimeRawContent>
):Realtime{

    return {

    } as Realtime;
}


class ApplicationRealtimeContext {
    userId!: string;
    currentSession?:string;
}

class RawRealtimePayload {

}

class ClientConnectedRealtimeEvent{
    public clientId!: string;
}

const realtime = createRealtime<ApplicationRealtimeContext, RawRealtimePayload>({
    payloadFormatter: (data:RawRealtimePayload)=>new ApplicationRealtimeContext(),
    adapter: {} as RealtimeAdapter,
    routes: [
        {
            route: (context:RealtimeApplicationContext<ApplicationRealtimeContext>)=>{
                context.emit<ClientConnectedRealtimeEvent>("",{clientId:"12345"});
            }
        }
    ],
    middlewares: []
}); 


realtime.on<ClientConnectedRealtimeEvent>("client_connected",(data)=>{
    console.log(data.clientId)
});