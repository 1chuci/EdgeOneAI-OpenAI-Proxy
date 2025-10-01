import { serve } from "https://deno.land/std@0.182.0/http/server.ts";

// 目标 API 的 URL
const TARGET_URL = "https://ai-chatbot-starter.edgeone.app/api/ai";

// 模型名称的映射关系
const MODEL_MAPPING = {
  "deepseek-reasoner": "DeepSeek-R1",
  "deepseek-chat": "DeepSeek-V3",
};

// 定义我们支持的、符合 OpenAI 格式的模型列表
const OPENAI_MODELS = [
  {
    id: "deepseek-chat",
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "system",
  },
  {
    id: "deepseek-reasoner",
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "system",
  },
];

/**
 * 主要的请求处理函数
 * @param {Request} req - 传入的请求对象
 * @returns {Response} - 返回的响应对象
 */
async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // 为所有响应添加 CORS 头，以允许跨域请求
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 路由 1: /v1/models
  if (path === "/v1/models" && req.method === "GET") {
    return new Response(JSON.stringify({
      object: "list",
      data: OPENAI_MODELS,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  // 路由 2: /v1/chat/completions
  if (path === "/v1/chat/completions" && req.method === "POST") {
    try {
      // 1. 解析传入的 OpenAI 格式的请求体
      const openaiRequest = await req.json();

      // 2. 转换模型名称
      const originalModel = openaiRequest.model;
      const targetModel = MODEL_MAPPING[originalModel];

      if (!targetModel) {
        return new Response(JSON.stringify({
          error: `Model '${originalModel}' not found. Available models: ${Object.keys(MODEL_MAPPING).join(", ")}`,
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      // 3. 构建转发到目标 API 的请求体
      const targetRequestBody = {
        model: targetModel,
        messages: openaiRequest.messages,
        // 如果 OpenAI 请求中包含 stream 参数，也一并转发
        ...(openaiRequest.stream !== undefined && { stream: openaiRequest.stream }),
      };

      // 4. 发起请求到目标 API
      const response = await fetch(TARGET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
           // 模仿 curl 命令中的一些关键 Header
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
        },
        body: JSON.stringify(targetRequestBody),
      });
      
      // 5. 将目标 API 的响应直接流式返回给客户端
      // 这种方式同时支持 stream 和非 stream 模式
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        },
      });

    } catch (error) {
      console.error("Error processing chat completion:", error);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  }

  // 404 Not Found
  return new Response("Not Found", { status: 404, headers: corsHeaders });
}

// 启动 Deno 服务器
console.log("Server running on http://localhost:8000");
serve(handler);
