"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExcelUploader } from "@/components/excel-uploader";
import { QuizCreator } from "@/components/quiz-creator";
import { Upload, Plus, ArrowLeft } from "lucide-react";
const buttonBase = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
const buttonDefault = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
const buttonGhost = `${buttonBase} hover:bg-accent hover:text-accent-foreground shadow-none`;
export default function ImportPage() {
    const router = useRouter();
    const [mode, setMode] = useState("choose");
    function handleBackToDashboard() {
        router.back();
    }
    if (mode === "excel") {
      return (<div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <button onClick={() => setMode("choose")} className={`${buttonGhost} mb-6`}>
            <ArrowLeft className="w-4 h-4 mr-2"/>
            Back
          </button>
          <ExcelUploader onSuccess={() => {
                setTimeout(() => handleBackToDashboard(), 2000);
            }} onCancel={() => setMode("choose")}/>
        </div>
      </div>);
    }
    if (mode === "manual") {
      return (<div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <button onClick={() => setMode("choose")} className={`${buttonGhost} mb-6`}>
            <ArrowLeft className="w-4 h-4 mr-2"/>
            Back
          </button>
          <QuizCreator onCreated={() => {
                handleBackToDashboard();
            }} onCancel={() => setMode("choose")}/>
        </div>
      </div>);
    }
    // Choose mode
    return (<div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto pt-16">
        <div className="mb-8">
          <button onClick={handleBackToDashboard} className={buttonGhost}>
            <ArrowLeft className="w-4 h-4 mr-2"/>
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Quiz</h1>
          <p className="text-slate-600">Choose how you want to create your quiz</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Excel Import Option */}
          <div className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode("excel")}>
            <div className="rounded-xl border bg-card text-card-foreground shadow h-full">
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-3">
                  <Upload className="w-6 h-6 text-green-600"/>
                </div>
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Import from Excel</h3>
              </div>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <p className="text-sm text-slate-600">
                Upload an Excel file (.xlsx) with your quiz questions and answers
              </p>
              <div className="bg-slate-50 rounded p-3 text-xs text-slate-700">
                <p className="font-semibold mb-2">Format Required:</p>
                <p>Question | Option A | Option B | Option C | Option D | Correct Option</p>
              </div>
              <button className={`${buttonDefault} w-full`} onClick={() => setMode("excel")}>
                <Upload className="w-4 h-4 mr-2"/>
                Import Excel
              </button>
            </div>
            </div>
          </div>

          {/* Manual Creation Option */}
          <div className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode("manual")}>
            <div className="rounded-xl border bg-card text-card-foreground shadow h-full">
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Plus className="w-6 h-6 text-blue-600"/>
                </div>
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Create Manually</h3>
              </div>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <p className="text-sm text-slate-600">
                Create your quiz questions manually through our easy-to-use form
              </p>
              <div className="bg-slate-50 rounded p-3 text-xs text-slate-700">
                <p className="font-semibold mb-2">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Add questions one by one</li>
                  <li>Set time limits</li>
                  <li>Preview before saving</li>
                </ul>
              </div>
              <button className={`${buttonDefault} w-full`} onClick={() => setMode("manual")}>
                <Plus className="w-4 h-4 mr-2"/>
                Create Manually
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
