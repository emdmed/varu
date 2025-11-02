import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export default function Input({ onSubmit }) {
  const [input, setInput] = useState("");

  useInput((inputChar, key) => {
    if (key.return) {
      onSubmit(input);
      setInput("");
    } else if (key.backspace || key.delete) {
      setInput(input.slice(0, -1));
    } else if (!key.ctrl && !key.meta && inputChar) {
      setInput(input + inputChar);
    }
  });

  return (
    <Box>
      <Text color="green">&gt; </Text>
      <Text>{input}</Text>
      <Text color="green">█</Text>
    </Box>
  );
}
