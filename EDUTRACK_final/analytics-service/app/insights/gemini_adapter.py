# ============================================================================
# EduTrack AI v2 - analytics-service/app/insights/gemini_adapter.py
# Adaptador do Google Gemini SDK (google-genai) para enriquecimento de insights
# ============================================================================

import json
from typing import List, Dict, Any, Optional
from app.config import settings

class GeminiAdapter:
    def __init__(self):
        self.api_key = settings.llm_api_key
        self.model = settings.llm_model
        self.timeout = settings.llm_timeout_seconds
        self.provider = settings.llm_provider.lower()
        self._client = None

    def is_available(self) -> bool:
        return self.provider == "gemini" and bool(self.api_key and self.api_key.strip())

    def _get_client(self):
        if not self._client and self.is_available():
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[GEMINI INIT WARN] Falha ao inicializar SDK google-genai: {e}")
                self._client = None
        return self._client

    def enrich_insights(self, student_first_name: str, insights_base: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enriquece os textos dos insights estruturados via API do Gemini.
        Garante:
        - Dados anônimos (apenas primeiro nome e fatos já calculados)
        - Sem alucinação de números
        - Fallback automático para regras em qualquer falha
        """
        if not self.is_available() or not insights_base:
            return insights_base

        client = self._get_client()
        if not client:
            return insights_base

        # Preparar payload estrito para o LLM
        prompt_items = []
        for ins in insights_base:
            prompt_items.append({
                "id": ins["id"],
                "codigo": ins["codigo"],
                "disciplina": ins.get("disciplina"),
                "severidade": ins.get("severidade"),
                "metricas": ins.get("metricas", {}),
                "texto_base": ins.get("texto")
            })

        system_instruction = (
            "Você é o assistente pedagógico e motivacional do EduTrack AI.\n"
            "Sua tarefa é reescrever o texto de cada recomendação para torná-lo natural, direto, construtivo e motivador em português do Brasil (pt-BR).\n"
            "REGRAS ESTRITAS:\n"
            "1. No máximo 2 frases curtas por insight.\n"
            "2. Use EXCLUSIVAMENTE os números e dados fornecidos. É TERMINANTEMENTE PROIBIDO inventar valores, porcentagens ou prazos.\n"
            "3. Termine com uma ação prática e encorajadora, sem culpabilizar o aluno.\n"
            "4. Retorne OBRIGATORIAMENTE um JSON válido com a lista de objetos contendo 'id' e 'texto'."
        )

        user_content = (
            f"Aluno: {student_first_name or 'Estudante'}\n"
            f"Fatos calculados:\n{json.dumps(prompt_items, ensure_ascii=False, indent=2)}\n\n"
            "Gere o JSON no seguinte formato:\n"
            '{\n  "recomendacoes": [\n    {"id": "...", "texto": "..."}\n  ]\n}'
        )

        try:
            response = client.models.generate_content(
                model=self.model,
                contents=user_content,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json",
                    "temperature": 0.4
                }
            )

            response_text = response.text
            parsed = json.loads(response_text)
            recs = parsed.get("recomendacoes", [])
            rec_map = {r.get("id"): r.get("texto") for r in recs if r.get("id") and r.get("texto")}

            # Mesclar os textos reescritos mantendo os dados originais
            enriched = []
            for ins in insights_base:
                ins_copy = dict(ins)
                if ins["id"] in rec_map:
                    ins_copy["texto"] = rec_map[ins["id"]]
                    ins_copy["fonte"] = "ia"
                enriched.append(ins_copy)

            return enriched
        except Exception as e:
            print(f"[GEMINI GENERATE WARN] Falha na chamada da API Gemini ({e}). Usando fallback por regras.")
            return insights_base

gemini_adapter = GeminiAdapter()
