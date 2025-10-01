import { serve } from "https://deno.land/std@0.182.0/http/server.ts";

// 目标 API 的 URL
const TARGET_URL = "https://ai-chatbot-starter.edgeone.app/api/ai";

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

async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (path === "/v1/models" && req.method === "GET") {
    return new Response(JSON.stringify({
      object: "list",
      data: OPENAI_MODELS,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (path === "/v1/chat/completions" && req.method === "POST") {
    try {
      const openaiRequest = await req.json();

      // 直接构建转发请求体，不再转换模型名称
      const targetRequestBody = {
        model: openaiRequest.model, // 直接使用客户端传来的模型名称
        messages: openaiRequest.messages,
        ...(openaiRequest.stream !== undefined && { stream: openaiRequest.stream }),
      };

      const response = await fetch(TARGET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
        },
        body: JSON.stringify(targetRequestBody),
      });
      
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
}

console.log("Server running on http://localhost:8000");
serve(handler);
