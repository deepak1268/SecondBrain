import type React from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  searchHandler: () => void;
}

const SearchBar = ({
  query,
  setQuery,
  searchHandler,
}: SearchBarProps) => {
  return (
    <div className="flex gap-3 w-full max-w-5xl">
      <div className="relative flex-1">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, tags, videos..."
          className="
            w-full
            h-16
            pl-14
            pr-6
            text-lg
            bg-white
            border border-gray-300
            rounded-2xl
            shadow-md
            placeholder:text-gray-400
            focus:outline-none
            focus:ring-2
            focus:ring-violet-500
            focus:border-violet-500
            transition-all
          "
        />
      </div>

      <button
        onClick={searchHandler}
        className="
          px-8
          h-16
          rounded-2xl
          bg-violet-600
          text-white
          font-medium
          hover:bg-violet-700
          transition-colors
        "
      >
        Search
      </button>
    </div>
  );
};

export default SearchBar;