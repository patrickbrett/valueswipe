import { useEffect, useState } from "react";
import run from "./lib/rank";
import "./App.css";
import { Button } from "@material-ui/core";

function App() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [resolver, setResolver] = useState<(value: boolean) => void>(() => {});
  const [message, setMessage] = useState<string>("");
  const [estRemaining, setEstRemaining] = useState(100);

  useEffect(() => {
    const dispatcher = {
      changeMessage: (message: string) => setMessage(message),
      ask: async (word1: string, word2: string) => {
        setWord1(word1);
        setWord2(word2);
        return await new Promise<boolean>((resolve) =>
          setResolver(() => resolve)
        );
      },
      updateEstRemaining: (count: number) => setEstRemaining(count)
    };

    run(dispatcher);
    return () => {};
  }, []);

  return (
    <div className="App">
      <p>{message}</p>
      <div className="button-container">
        <Button color="secondary" onClick={() => resolver(true)}>
          {word1}
        </Button>
        <Button color="secondary" onClick={() => resolver(false)}>
          {word2}
        </Button>
      </div>
      {/* <p>
        Est remaining: {estRemaining}
      </p> */}
    </div>
  );
}

export default App;
