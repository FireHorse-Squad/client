# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Ideas
- ## making the wage application better: optimization, user friendly, UI/UX, Efficiency, Secure JWT, Scalability
- Cloud hosting and maintanence
- timeline: deadline: 28 Nov
- ## cashing, lazy loading
- #1742c4
- #2E368F



## Test [local, cloud]: vercel | heroku
## build, consider web sockets???



## Name of the system?? Wage Portal, Wage Hub, Wage Centre, Clydesdale Unified Wage Software [C-U-W-S]


## analytics -> wages graphs, invoices graphs, bar, line, pi chart(Semi,ad-hoc,task)
## wages|invoice - monthly -> date range

## Archieving
timesheets after batch export

## Simple React Application
import { useState } from 'react';

const App = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
          User Info
        </h1>

        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <input
          type="number"
          placeholder="Enter your age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <div className="mt-6 p-4 border-t border-gray-200">
          <p className="text-lg text-gray-700">
            <strong>Name:</strong> {name || "—"}
          </p>
          <p className="text-lg text-gray-700">
            <strong>Age:</strong> {age || "—"}
          </p>
        </div>
      </div>

    </div>
  );
};

export default App;


### oVERRIDE TIME
IS NOT WORKING AGAIN?????

1910 -GW
2002 - c14
change the rate back for roof on GW

for semi- its adding lunch
working for ad-hoc


## Importing CSV Timesheet
Expected CSV column order:

timesheet_number
timesheet_date
client_id
client_name
co_number
transaction_code
occupation
shift_type
start_time
end_time