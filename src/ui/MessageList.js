import React from "react";
import { Box, Text } from "ink";

export default function MessageList({ messages }) {
  const recentMessages = messages.slice(-20);

  return (
    <Box flexDirection="column">
      {recentMessages.length === 0 ? (
        <Text dimColor color="green">No messages yet :(</Text>
      ) : (
        recentMessages.map((msg, i) => {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          const isYou = msg.peerId === "you";

          return (
            <Box key={i} marginY={0}>
              <Text color="green">[{time}] </Text>
              <Text inverse color={isYou ? "green" : "white"}>{" "}{msg.username}{" "}</Text>
              <Text color="green">: </Text>
              <Text>{msg.text}</Text>
            </Box>
          );
        })
      )}
    </Box>
  );
}
