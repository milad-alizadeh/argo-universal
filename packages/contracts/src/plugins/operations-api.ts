import type { WireJson } from '#plugin-wire-json';
import type {
  PluginOperationCaller,
  PluginOperationNeed,
  PluginOperationParam,
} from './plugin-operations';

/*
 * One of the Plugin's own Operations as its worker runs it: the params core checked against the
 * manifest, and who ran it. Whatever it returns crosses as the Operation's JSON result.
 */
export type OperationResult = WireJson | void;

/*
 * What the types know of one declared Operation: its manifest entry's params and caller needs, as
 * `argo-plugin types` writes them from `plugin.json`, so names and choices keep their literal types.
 */
export type OperationDeclaration = Readonly<{
  params?: Readonly<
    Record<string, Pick<PluginOperationParam, 'type' | 'required' | 'choices'>>
  >;
  caller?: readonly PluginOperationNeed[];
}>;

// A Plugin's declared Operations by name. Untyped, any name takes any declared kind of param.
export type OperationDeclarations = Readonly<
  Record<string, OperationDeclaration>
>;

// Spells an intersection out as one object, so an author reads the params and not the types they came from.
type Spelled<Fields> = { [Key in keyof Fields]: Fields[Key] };

type ParamTypes = { string: string; number: number; boolean: boolean };

type ParamValue<Param> = Param extends { choices: readonly (infer Choice)[] }
  ? Choice
  : Param extends { type: keyof ParamTypes }
    ? ParamTypes[Param['type']]
    : never;

type DeclaredParams<Operation> = Operation extends {
  params: infer Params;
}
  ? Params
  : Record<never, never>;

type RequiredNames<Params> = {
  [Name in keyof Params]: Params[Name] extends { required: true }
    ? Name
    : never;
}[keyof Params];

type Needs<Operation> = Operation extends {
  caller: readonly (infer Need)[];
}
  ? Need
  : never;

/*
 * The params the handler is handed: each declared one of its declared type, or one of its choices,
 * present whenever it is required.
 */
export type OperationParams<Operation> = Spelled<
  {
    readonly [Name in RequiredNames<DeclaredParams<Operation>>]: ParamValue<
      DeclaredParams<Operation>[Name]
    >;
  } & {
    readonly [
      Name in Exclude<
        keyof DeclaredParams<Operation>,
        RequiredNames<DeclaredParams<Operation>>
      >
    ]?: ParamValue<DeclaredParams<Operation>[Name]>;
  }
>;

// Who ran it; an Operation that needs a Session or a Project always has it, core refused the run otherwise.
export type OperationCaller<Operation> = Spelled<
  Readonly<PluginOperationCaller> &
    ('session' extends Needs<Operation>
      ? { readonly sessionId: string }
      : unknown) &
    ('project' extends Needs<Operation>
      ? { readonly projectId: string }
      : unknown)
>;

// What a run names: the params, and for an Operation that needs a Project, the one it acts in if not the Caller's.
export type OperationArgs<Operation> = Spelled<
  OperationParams<Operation> &
    ('project' extends Needs<Operation>
      ? { readonly projectId?: string }
      : unknown)
>;

export type OperationHandler<Operation = OperationDeclaration> = (
  params: OperationParams<Operation>,
  caller: OperationCaller<Operation>,
) => OperationResult | Promise<OperationResult>;

/*
 * `argo.operations`: the handler for each Operation the manifest declares, registered as the Plugin
 * starts. A name the manifest does not declare fails type-checking.
 */
export type OperationsApi<Operations = OperationDeclarations> = Readonly<{
  register: <Name extends keyof Operations & string>(
    name: Name,
    handler: OperationHandler<Operations[Name]>,
  ) => void;
}>;
