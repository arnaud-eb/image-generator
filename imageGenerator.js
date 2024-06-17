import { openai } from "./openai.js";

const QUESTION = process.argv[2] || "hi";

const messages = [
  {
    role: "user",
    content: QUESTION,
  },
];

const functions = {
  async generateImage({ prompt }) {
    const image = await openai.images.generate({ prompt });
    console.log("image prompt", prompt);
    console.log("image", image);
    return image.data[0].url;
  },
};

const getCompletions = (messages) => {
  return openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0,
    tools: [
      {
        type: "function",
        function: {
          name: "generateImage",
          description: "Create or generate image based on a description",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The description of the image to generate",
              },
            },
            required: ["prompt"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });
};

let response;
while (true) {
  response = await getCompletions(messages);
  console.log("getCompletions response", response);
  const finishReason = response.choices[0].finish_reason;
  const responseMessage = response.choices[0].message;
  console.log("getCompletions responseMessage", responseMessage);
  if (finishReason === "stop") {
    console.log(responseMessage.content);
    break;
  } else if (finishReason === "tool_calls") {
    messages.push(responseMessage);

    const toolCalls = responseMessage.tool_calls;
    for (const toolCall of toolCalls) {
      console.log("toolCall", toolCall);
      const fnName = toolCall.function.name;

      const fnToCall = await functions[fnName];
      const fnArgs = JSON.parse(toolCall.function.arguments);

      const result = fnToCall(fnArgs);

      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: fnName,
        content: JSON.stringify(result),
      });
    }
  }
}
