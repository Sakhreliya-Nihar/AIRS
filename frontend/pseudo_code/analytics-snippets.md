
1. Asynchronous Data Fetching in useEffect
    My Code:
    ```TypeScript

    const fetchData = async () => { ... }
    useEffect(() => {
      fetchData();
    }, []);

    ``` 

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/53332321/react-hook-warnings-for-async-function-in-useeffect-useeffect-function-must-ret

        Thread: https://stackoverflow.com/questions/71174509/proper-async-await-syntax-for-fetching-data-using-useeffect-hook-in-react

    The Snippet I learned from:
    ```JavaScript

    useEffect(() => {
      const getDatas = async () => {
        const response = await fetch("https://...");
        const data = await response.json();
        setApiData(data);
      }
      getDatas(); // Calling it inside to avoid the Promise return warning
    }, []);

    ```

2. Custom Colored Slices in Recharts <PieChart>

    My Code:
    ```TypeScript

    <Pie data={severityData} ...>
      {severityData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name]} />
      ))}
    </Pie>

    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/76516609/how-do-i-change-legend-color-in-a-recharts-pie-chart

        Thread: https://stackoverflow.com/questions/77514248/how-to-customize-recharts-pie-chart

    The Snippet I learned from:
    ```JavaScript

    // Recharts requires the Cell approach for dynamic fills
    <Pie data={data} ...>
      {data.map((entry, index) => {
        return <Cell key={`cell-${index}`} fill={COLORS[index]} />;
      })}
    </Pie>

    ```

3. Fading Gradient in Recharts <AreaChart>

    My Code:
    ```TypeScript

    <defs>
      <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
      </linearGradient>
    </defs>
    <Area fill="url(#colorAttacks)" ... />

    ```

    Source / GitHub Issues:

        Recharts Official GitHub: https://github.com/recharts/recharts/issues/757

        Recharts Official GitHub: https://github.com/recharts/recharts/discussions/4925

    The Snippet I learned from:
    ```JavaScript

    // The exact implementation from the Recharts repository examples
    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
    </linearGradient>
    // ...
    <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />

    ```

4. Passing Icons as Props in TypeScript

    My Code:
    ```TypeScript

    interface StatCardProps {
      // ...
      icon: React.ElementType; // The TypeScript way to accept a component
    }

    const StatCard: React.FC<StatCardProps> = ({ label, icon: Icon }) => (
       // Capitalizing 'Icon' so React knows it's a component, not an HTML tag
       <Icon size={20} />
    )

    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/77822942/how-to-use-svg-icon-as-a-prop-in-react

        Thread: https://stackoverflow.com/questions/76652642/how-a-write-a-function-that-receives-a-component-then-adds-some-parameter-to-it

    The Snippet I learned from:
    ```JavaScript

    import type { LucideIcon } from 'lucide-react';

    interface ButtonProps { icon: LucideIcon } // Alternatively, React.ElementType

    // Destructuring with an uppercase alias 'icon : Icon' is required to render it
    export const Button = ({ icon : Icon }: ButtonProps) => <button><Icon /></button>;

    ```

    