import React, { ChangeEvent, useMemo, useState } from "react";

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

type LLMResponse = {
  assunto: string;
  mensagem: string;
  assinatura: string;
};

type StepKey =
  | "publicoAlvo"
  | "canal"
  | "tom"
  | "conteudo"
  | "objetivo"
  | "assinatura";

type FormState = {
  publicoAlvo: string;
  canal: string;
  tom: string;
  conteudo: string;
  objetivo: string;
  assinatura: string;
};

const canalOptions = [
  { value: "", label: "Selecione o canal" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "intranet", label: "Intranet" },
  { value: "mural", label: "Mural" },
];

const tomOptions = [
  { value: "", label: "Selecione o tom" },
  { value: "formal", label: "Formal" },
  { value: "acolhedor", label: "Acolhedor" },
  { value: "motivacional", label: "Motivacional" },
  { value: "neutro", label: "Neutro" },
  { value: "comemorativo", label: "Comemorativo" },
];

function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, "").trim();
}

function validateLLMResponse(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Resposta não é um objeto válido");
    return { isValid: false, errors };
  }

  const requiredKeys = ["assunto", "mensagem", "assinatura"];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      errors.push(`Chave obrigatória '${key}' não encontrada`);
    }
  }

  if (data.mensagem) {
    const mensagem = data.mensagem.trim();
    if (mensagem.length === 0) {
      errors.push("Mensagem não pode estar vazia");
    } else if (mensagem.length < 10) {
      errors.push("Mensagem muito curta (mínimo 10 caracteres)");
    } else if (!mensagem.includes(".")) {
      errors.push(
        "Mensagem deve conter pelo menos uma frase completa (com ponto final)"
      );
    }
  }

  if (data.assunto && data.assunto.trim().length === 0) {
    errors.push("Assunto não pode estar vazio");
  }

  if (data.assinatura && data.assinatura.trim().length === 0) {
    errors.push("Assinatura não pode estar vazia");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function sanitizeLLMResponse(data: LLMResponse): LLMResponse {
  return {
    assunto: sanitizeText(data.assunto || ""),
    mensagem: sanitizeText(data.mensagem || ""),
    assinatura: sanitizeText(data.assinatura || ""),
  };
}

const steps: { key: StepKey; label: string; placeholder: string }[] = [
  {
    key: "publicoAlvo",
    label: "Público-alvo",
    placeholder: "ex: todos colaboradores, time de vendas",
  },
  { key: "canal", label: "Canal de envio", placeholder: "Selecione o canal" },
  { key: "tom", label: "Tom da mensagem", placeholder: "Selecione o tom" },
  {
    key: "conteudo",
    label: "Conteúdo principal",
    placeholder: "resumo objetivo do conteúdo",
  },
  {
    key: "objetivo",
    label: "Objetivo da mensagem",
    placeholder: "informar, engajar, comunicar mudança, parabenizar, convocar",
  },
  {
    key: "assinatura",
    label: "Assinatura ou remetente",
    placeholder: "ex: Equipe de RH, Diretoria",
  },
];

export default function App() {
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [response, setResponse] = useState<LLMResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [form, setForm] = useState<FormState>({
    publicoAlvo: "",
    canal: "",
    tom: "",
    conteudo: "",
    objetivo: "",
    assinatura: "",
  });

  const atFirst = current === 0;
  const atLast = current === steps.length - 1;

  const canAdvance = useMemo(() => {
    const key = steps[current].key;
    return Boolean(form[key].trim());
  }, [current, form]);

  function goNext(): void {
    if (!canAdvance) return;

    const currentKey = steps[current].key;
    const currentValue = form[currentKey];
    const sanitizedValue = sanitizeText(currentValue);

    if (sanitizedValue !== currentValue) {
      setForm((f: FormState) => ({ ...f, [currentKey]: sanitizedValue }));
    }

    setCurrent((c: number) => Math.min(c + 1, steps.length - 1));
  }

  function goPrev(): void {
    setCurrent((c: number) => Math.max(c - 1, 0));
  }

  function handleChange(key: StepKey, value: string): void {
    setForm((f: FormState) => ({ ...f, [key]: value }));
  }

  function validateForm(): ValidationResult {
    const errors: string[] = [];

    const requiredFields: StepKey[] = [
      "publicoAlvo",
      "canal",
      "tom",
      "conteudo",
      "objetivo",
      "assinatura",
    ];
    for (const field of requiredFields) {
      if (!form[field].trim()) {
        const fieldLabel = steps.find((s) => s.key === field)?.label || field;
        errors.push(`${fieldLabel} é obrigatório`);
      }
    }

    if (form.conteudo.trim().length < 10) {
      errors.push("Conteúdo principal deve ter pelo menos 10 caracteres");
    }

    if (form.objetivo.trim().length < 5) {
      errors.push("Objetivo deve ter pelo menos 5 caracteres");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSuccess(null);
    setResponse(null);
    setValidationErrors([]);

    const formValidation = validateForm();
    if (!formValidation.isValid) {
      setValidationErrors(formValidation.errors);
      setError("Formulário contém erros. Corrija antes de enviar.");
      return;
    }

    setSubmitting(true);

    try {
      const sanitizedForm = Object.keys(form).reduce((acc, key) => {
        acc[key as StepKey] = sanitizeText(form[key as StepKey]);
        return acc;
      }, {} as FormState);

      const payload = { ...sanitizedForm };
      const url = import.meta.env.VITE_WEBHOOK_URL as string;
      if (!url) throw new Error("Webhook não configurado");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Falha ao enviar: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      const validation = validateLLMResponse(data);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setError("Resposta do LLM não atende aos critérios de qualidade");
        return;
      }

      const sanitizedData = sanitizeLLMResponse(data as LLMResponse);
      setResponse(sanitizedData);
      setSuccess("Mensagem gerada com sucesso!");
    } catch (e: any) {
      setError(e.message || "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy(text: string): void {
    navigator.clipboard.writeText(text);
    setSuccess("Copiado para a área de transferência!");
  }

  function handleReset(): void {
    setForm({
      publicoAlvo: "",
      canal: "",
      tom: "",
      conteudo: "",
      objetivo: "",
      assinatura: "",
    });
    setCurrent(0);
    setError(null);
    setSuccess(null);
    setResponse(null);
    setValidationErrors([]);
  }

  const active = steps[current];

  if (response) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-6 py-4">
            <h1 className="text-xl font-semibold text-slate-800">
              Assistente de Mensagens • RH
            </h1>
            <p className="text-sm text-slate-500">
              Mensagem gerada com sucesso!
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Assunto
                </h2>
                <button
                  onClick={() => handleCopy(response.assunto)}
                  className="rounded-md bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700"
                >
                  Copiar
                </button>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-800">{response.assunto}</p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Mensagem
                </h2>
                <button
                  onClick={() => handleCopy(response.mensagem)}
                  className="rounded-md bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700"
                >
                  Copiar
                </button>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-slate-800">
                  {response.mensagem}
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Assinatura
                </h2>
                <button
                  onClick={() => handleCopy(response.assinatura)}
                  className="rounded-md bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700"
                >
                  Copiar
                </button>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-800">{response.assinatura}</p>
              </div>
            </section>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="rounded-md bg-slate-200 px-6 py-2 text-sm text-slate-700 hover:bg-slate-300"
              >
                Nova Mensagem
              </button>
              <button
                onClick={() =>
                  handleCopy(
                    `${response.assunto}\n\n${response.mensagem}\n\n${response.assinatura}`
                  )
                }
                className="rounded-md bg-brand-600 px-6 py-2 text-sm text-white hover:bg-brand-700"
              >
                Copiar Tudo
              </button>
            </div>

            {success && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-6 py-4 text-center text-xs text-slate-500">
            <a
              href="https://github.com/SalowQ"
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 hover:underline"
            >
              desenvolvido por Igor
            </a>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800">
            Assistente de Mensagens • RH
          </h1>
          <p className="text-sm text-slate-500">
            Crie mensagens claras e objetivas com o auxílio de IA
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-600">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={
                  "h-8 w-8 rounded-full grid place-items-center border " +
                  (i === current
                    ? "bg-brand-600 text-white border-brand-600"
                    : i < current
                    ? "bg-brand-200 border-brand-200 text-brand-800"
                    : "bg-white border-slate-300 text-slate-600")
                }
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="h-px w-10 bg-slate-300" />
              )}
            </div>
          ))}
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-medium text-slate-800">
            {active.label}
          </h2>
          <p className="mb-4 text-sm text-slate-500">Preencha a etapa atual</p>

          <div className="flex flex-col gap-3">
            {active.key === "conteudo" ? (
              <textarea
                value={form.conteudo}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  handleChange("conteudo", e.target.value)
                }
                placeholder={active.placeholder}
                className="min-h-[140px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            ) : active.key === "canal" ? (
              <select
                value={form.canal}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  handleChange("canal", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {canalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : active.key === "tom" ? (
              <select
                value={form.tom}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  handleChange("tom", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {tomOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form[active.key]}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange(active.key, e.target.value)
                }
                placeholder={active.placeholder}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            )}

            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={goPrev}
                disabled={atFirst || submitting}
                className={
                  "rounded-md px-4 py-2 text-sm " +
                  (atFirst
                    ? "bg-slate-100 text-slate-400"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300")
                }
              >
                Voltar
              </button>

              {!atLast ? (
                <button
                  onClick={goNext}
                  disabled={!canAdvance || submitting}
                  className={
                    "rounded-md px-4 py-2 text-sm " +
                    (!canAdvance
                      ? "bg-brand-200 text-white"
                      : "bg-brand-600 text-white hover:bg-brand-700")
                  }
                >
                  Avançar
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canAdvance}
                  className={
                    "rounded-md px-4 py-2 text-sm " +
                    (submitting
                      ? "bg-brand-300 text-white"
                      : "bg-brand-600 text-white hover:bg-brand-700")
                  }
                >
                  {submitting ? "Enviando..." : "Enviar"}
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
                {validationErrors.length > 0 && (
                  <ul className="mt-2 list-disc list-inside">
                    {validationErrors.map((err: string, index: number) => (
                      <li key={index} className="text-xs">
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {success && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-800">
            Resumo das informações
          </h3>
          <div className="grid gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Público-alvo
                </span>
                {form.publicoAlvo ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                )}
              </div>
              <div className="text-sm text-slate-800">
                {form.publicoAlvo || (
                  <span className="text-slate-400 italic">Não preenchido</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Canal de envio
                </span>
                {form.canal ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                )}
              </div>
              <div className="text-sm text-slate-800">
                {form.canal ? (
                  canalOptions.find((opt) => opt.value === form.canal)?.label
                ) : (
                  <span className="text-slate-400 italic">Não selecionado</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Tom da mensagem
                </span>
                {form.tom ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                )}
              </div>
              <div className="text-sm text-slate-800">
                {form.tom ? (
                  tomOptions.find((opt) => opt.value === form.tom)?.label
                ) : (
                  <span className="text-slate-400 italic">Não selecionado</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Conteúdo principal
                </span>
                {form.conteudo ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                )}
              </div>
              <div className="text-sm text-slate-800">
                {form.conteudo || (
                  <span className="text-slate-400 italic">Não preenchido</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Objetivo da mensagem
                </span>
                {form.objetivo ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                )}
              </div>
              <div className="text-sm text-slate-800">
                {form.objetivo || (
                  <span className="text-slate-400 italic">Não preenchido</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Assinatura ou remetente
                </span>
                {form.assinatura ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                )}
              </div>
              <div className="text-sm text-slate-800">
                {form.assinatura || (
                  <span className="text-slate-400 italic">Não preenchido</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 text-center text-xs text-slate-500">
          <a
            href="https://github.com/SalowQ"
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 hover:underline"
          >
            desenvolvido por Igor
          </a>
        </div>
      </footer>
    </div>
  );
}
