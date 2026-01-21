// types.ts
export type WorkerMessage =
    | ExecuteMessage
    | PersistentMessage

export interface ExecuteMessage {
    type?: 'execute'
    fn: string
    args: unknown[]
}

export interface PersistentMessage {
    type: 'persistent'
    fn: string
    args: unknown[]
}

export type WorkerResponse =
    | ExecuteSuccessResponse
    | ExecuteErrorResponse
    | PersistentErrorResponse

export interface ExecuteSuccessResponse {
    success: true
    result: unknown
}

export interface ExecuteErrorResponse {
    success: false
    error: {
        message: string
        stack?: string
    }
}

export interface PersistentErrorResponse {
    type: 'error'
    error: {
        message: string
        stack?: string
    }
}