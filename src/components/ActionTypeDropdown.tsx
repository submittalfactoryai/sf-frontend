import { useRef, useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const ActionTypeDropdown = ({
    allActions,
    selectedActions,
    setSelectedActions,
    label = "Action Type",
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex justify-between items-center px-3 py-2 border rounded-lg bg-white text-gray-700 text-sm hover:border-blue-400"
            >
                <span>
                    {label}
                    {selectedActions.length > 0 && (
                        <span className="ml-2 text-blue-500 font-bold">
                            ({selectedActions.length})
                        </span>
                    )}
                </span>
                {open ? (
                    <FiChevronUp className="ml-2" />
                ) : (
                    <FiChevronDown className="ml-2" />
                )}
            </button>
            {open && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-20 p-3">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {allActions.map((action) => (
                            <label
                                key={action.value}
                                className="flex items-center gap-2 py-1 cursor-pointer text-sm"
                            >
                                <input
                                    type="checkbox"
                                    value={action.value}
                                    checked={selectedActions.includes(action.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedActions((prev) => [...prev, action.value]);
                                        } else {
                                            setSelectedActions((prev) =>
                                                prev.filter(
                                                    (val) =>
                                                        val.toLowerCase() !== action.value.toLowerCase()
                                                )
                                            );
                                        }
                                    }}
                                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                />
                                <span>{action.label}</span>
                            </label>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedActions([])}
                        className="mt-3 w-full text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 border border-gray-200 text-gray-700"
                    >
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActionTypeDropdown;
