import { describe, expect, it } from "vitest";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import {
  createInlineTransactionAdapter,
  runTransactionBoundary,
  type TransactionAdapter,
} from "@/lib/services/transaction-boundary";

describe("transaction boundary", () => {
  it("runs inline when transaction is not required", async () => {
    const result = await runTransactionBoundary(
      {
        context: { operationName: "internalRead" },
      },
      async () => repositoryOk("done"),
    );

    expect(result).toEqual(repositoryOk("done"));
  });

  it("blocks mutation when transaction is required but no adapter is supplied", async () => {
    let called = false;

    const result = await runTransactionBoundary(
      {
        context: { operationName: "publicMutation" },
        requireTransaction: true,
      },
      async () => {
        called = true;
        return repositoryOk("should not run");
      },
    );

    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });

  it("normalizes operation name before passing context to adapter", async () => {
    const seenOperationNames: string[] = [];
    const adapter: TransactionAdapter = {
      async run(context, operation) {
        seenOperationNames.push(context.operationName);
        return operation();
      },
    };

    const result = await runTransactionBoundary(
      {
        context: { operationName: "  saveMemoryPatch  " },
        adapter,
        requireTransaction: true,
      },
      async () => repositoryOk("done"),
    );

    expect(result).toEqual(repositoryOk("done"));
    expect(seenOperationNames).toEqual(["saveMemoryPatch"]);
  });

  it("returns adapter operation errors", async () => {
    const result = await runTransactionBoundary(
      {
        context: { operationName: "saveMemoryPatch" },
        adapter: createInlineTransactionAdapter(),
      },
      async () => repositoryError("validation_failed", "bad mutation"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("rejects blank operation names", async () => {
    const result = await runTransactionBoundary(
      {
        context: { operationName: "  " },
      },
      async () => repositoryOk("done"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });
});
