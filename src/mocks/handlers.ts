import { HttpResponse, http } from "msw";

export const handlers = [
  // Anthropic streaming mock
  http.post("https://api.anthropic.com/v1/messages", () => {
    return new HttpResponse(
      'data: {"type":"content_block_delta","delta":{"text":"Test narrative."}}\ndata: [DONE]\n',
      {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  }),
];
