class ApiResponse {
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode
        this.data = data,
        this.message = message,
        this.success = statusCode < 400 // success codes defined b/w 0 to 399 
    }
}