
import firehorseLogo from "../assets/animations/icon_no_bg.png";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      
      <div className="text-center">

        <img
          src={firehorseLogo}
          alt="FireHorse Logo"
          className="mx-auto mb-8 w-48 h-48 object-contain"
        />

        <h1 className="text-6xl md:text-8xl font-black tracking-widest text-slate-800">
          COMING SOON
        </h1>

        <p className="mt-5 text-lg md:text-xl font-medium text-slate-500">
          Something exciting is on the way.
        </p>

        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          FireHorse Payroll
        </p>

      </div>

    </div>
  );
};

export default Dashboard;

