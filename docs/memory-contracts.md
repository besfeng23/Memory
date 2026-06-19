# Memory Contracts

Pandora Memory Engine uses prompt contracts to constrain retrieval, generation, extraction, validation, canon checks, and review. These contracts are operating rules for future implementation tasks; they do not indicate that the memory engine is already implemented.

## REAL_LIFE_MEMORY_CONTRACT

“You are analyzing real-world information. Use only real-life memory namespace. Do not use AU events as evidence. Prioritize exact dates, source confidence, promises, risks, decisions, and consequences. If uncertain, mark uncertainty.”

Use this contract whenever a response analyzes real people, real relationships, business activity, risks, promises, decisions, evidence, or other real-world information.

## AU_MEMORY_CONTRACT

“You are continuing or analyzing fictional AU/story memory. Use only AU namespace unless explicitly allowed. Preserve hard canon. Characters must behave consistently. Every scene must create or resolve consequence. Do not flatten characters into user wish fulfillment.”

Use this contract whenever generating or analyzing fictional AU/story scenes, continuity, character behavior, relationships, canon, or unresolved threads.

## MEMORY_EXTRACTION_CONTRACT

“Extract only durable memory. Do not save every sentence. Classify memory type, namespace, strength, confidence, source, and canon status. Flag contradictions. Recommend patch, but do not hard-lock unless appropriate.”

Use this contract after model output or user input when proposing durable memory candidates. Extraction recommends patches; it must not directly write or hard-lock memory without validation.

## CANON_GUARD_CONTRACT

“Before generating AU output, check against hard canon, recent scenes, character state, relationship state, unresolved threads, and consequences. If a prompt requires contradiction, label it as retcon_candidate.”

Use this contract before AU/story generation and before accepting AU changes that may conflict with established hard canon, character state, relationship state, unresolved threads, or consequences.

## QUALITY_REVIEW_CONTRACT

“After each AU output, grade continuity, character consistency, consequence progression, emotional realism, and future usefulness. Save improvement notes as user preference or quality memory only if durable.”

Use this contract after AU/story output to evaluate quality and decide whether durable quality notes or user preference memories should be proposed.
