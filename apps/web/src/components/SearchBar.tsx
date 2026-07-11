"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { searchLocations, type SearchResult } from "@/lib/search-index";

interface SearchBarProps {
  index: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

export function SearchBar({ index, onSelect }: SearchBarProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = searchLocations(query, index);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const select = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      setQuery("");
      close();
      inputRef.current?.blur();
    },
    [onSelect, close],
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!inputRef.current?.closest(".search-bar")?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [close]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && results.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setActiveIndex(0);
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === "Escape") {
      close();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="search-bar">
      <label className="search-bar__label" htmlFor={listId}>
        Search
      </label>
      <input
        ref={inputRef}
        id={listId}
        type="search"
        className="search-bar__input"
        placeholder="County, city, ZIP, or metro…"
        value={query}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${listId}-results`}
        aria-autocomplete="list"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(e.target.value.trim().length >= 2);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && results.length > 0 && (
        <ul id={`${listId}-results`} className="search-bar__results" role="listbox">
          {results.map((result, i) => (
            <li key={`${result.kind}-${result.id}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`search-bar__result${i === activeIndex ? " search-bar__result--active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(result)}
              >
                <span className="search-bar__result-label">{result.label}</span>
                <span className="search-bar__result-sub">{result.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
