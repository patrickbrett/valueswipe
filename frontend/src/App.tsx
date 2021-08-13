import { useEffect, useState } from "react";
import run from "./lib/rank";
import "./App.css";

function App() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [resolver, setResolver] = useState<(value: boolean) => void>(() => {});
  const [message, setMessage] = useState<string>("");

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
    };

    run(dispatcher);
    return () => {};
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>{message}</p>
        <p>
          <button onClick={() => resolver(true)}>{word1}</button>
        </p>
        <p>
          <button onClick={() => resolver(false)}>{word2}</button>
        </p>
      </header>
    </div>
  );
}

export default App;
