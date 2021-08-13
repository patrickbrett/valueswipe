import { useEffect, useState } from "react";
import run from "./lib/rank";
import "./App.css";

function App() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [resolver, setResolver] = useState<(value: boolean) => void>(() => {});

  useEffect(() => {
    const dispatcher = {
      ask: async (word1: string, word2: string) => {
        setWord1(word1);
        setWord2(word2);
        const res = await new Promise<boolean>((resolve) => setResolver(() => resolve));
        return res;
      },
    };

    run(dispatcher);
    return () => {};
  }, []);

  return (
    <div className="App">
      <header className="App-header">
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
