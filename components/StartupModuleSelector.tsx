"use client";

import {
  STARTUP_MODULES,
  normalizeStartupModuleIds,
  startupModuleCategoryLabels,
  startupModuleCategoryOrder,
  startupModulePresets
} from "@/lib/startupModules";
import type { StartupModuleCategoryKey } from "@/lib/types";

interface StartupModuleSelectorProps {
  selectedModuleIds: number[];
  onChange: (moduleIds: number[]) => void;
  title: string;
  description: string;
}

function toSelectedSet(moduleIds: number[]) {
  return new Set(normalizeStartupModuleIds(moduleIds));
}

export default function StartupModuleSelector({
  selectedModuleIds,
  onChange,
  title,
  description
}: StartupModuleSelectorProps) {
  const selectedSet = toSelectedSet(selectedModuleIds);
  const selectedModules = STARTUP_MODULES.filter((module) => selectedSet.has(module.id)).sort(
    (a, b) => a.order - b.order
  );
  const participantVisibleModules = selectedModules.filter((module) => !module.isAdminOnly);

  const updateSelection = (nextIds: number[]) => {
    onChange(normalizeStartupModuleIds(nextIds));
  };

  const toggleModule = (moduleId: number) => {
    const next = new Set(selectedSet);
    if (next.has(moduleId)) {
      next.delete(moduleId);
    } else {
      next.add(moduleId);
    }
    updateSelection(Array.from(next));
  };

  const selectCategory = (category: StartupModuleCategoryKey) => {
    const categoryIds = STARTUP_MODULES.filter((module) => module.category === category).map((module) => module.id);
    updateSelection([...selectedSet, ...categoryIds]);
  };

  const clearCategory = (category: StartupModuleCategoryKey) => {
    const categoryIds = new Set(
      STARTUP_MODULES.filter((module) => module.category === category).map((module) => module.id)
    );
    updateSelection(Array.from(selectedSet).filter((moduleId) => !categoryIds.has(moduleId)));
  };

  return (
    <section className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-800">{title}</p>
          <p className="mt-1 text-sm leading-6 text-blue-950">{description}</p>
          <p className="mt-2 text-sm font-semibold text-blue-900">
            선택된 모듈 {selectedModules.length}개 · 교육생 노출 {participantVisibleModules.length}개
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-800"
            onClick={() => updateSelection(STARTUP_MODULES.map((module) => module.id))}
            type="button"
          >
            전체 선택
          </button>
          <button
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
            onClick={() => updateSelection([])}
            type="button"
          >
            전체 해제
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {startupModulePresets.map((preset) => (
          <button
            key={preset.id}
            className="rounded-md border border-blue-200 bg-white p-3 text-left text-xs transition-colors hover:border-blue-400 hover:bg-blue-50"
            onClick={() => updateSelection(preset.moduleIds)}
            type="button"
          >
            <span className="font-bold text-blue-900">{preset.title}</span>
            <span className="mt-1 block leading-5 text-blue-800">{preset.description}</span>
            <span className="mt-1 block text-blue-600">{preset.moduleIds.length}개 모듈</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {startupModuleCategoryOrder.map((category) => {
          const modules = STARTUP_MODULES.filter((module) => module.category === category);
          const selectedCount = modules.filter((module) => selectedSet.has(module.id)).length;
          return (
            <article key={category} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-950">{startupModuleCategoryLabels[category]}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedCount}/{modules.length}개 선택
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-800"
                    onClick={() => selectCategory(category)}
                    type="button"
                  >
                    단계 선택
                  </button>
                  <button
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    onClick={() => clearCategory(category)}
                    type="button"
                  >
                    단계 해제
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {modules.map((module) => (
                  <label
                    key={module.id}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors ${
                      selectedSet.has(module.id)
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      checked={selectedSet.has(module.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-700"
                      onChange={() => toggleModule(module.id)}
                      type="checkbox"
                    />
                    <span>
                      <span className="font-bold text-gray-950">
                        {module.order}. {module.title}
                      </span>
                      {module.isAdminOnly ? (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                          관리자용
                        </span>
                      ) : null}
                      <span className="mt-1 block leading-5 text-gray-600">{module.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-bold text-gray-950">교육생에게 보일 순서 미리보기</p>
        {participantVisibleModules.length ? (
          <ol className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            {participantVisibleModules.map((module, index) => (
              <li key={module.id} className="rounded-md bg-gray-50 px-3 py-2 text-gray-700">
                <span className="font-bold text-gray-950">{index + 1}. </span>
                {module.title}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            교육생에게 노출될 모듈이 없습니다. 관리자 전용 모듈만 선택했는지 확인해주세요.
          </p>
        )}
      </div>
    </section>
  );
}
