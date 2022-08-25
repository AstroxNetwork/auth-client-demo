import type { Principal } from "@dfinity/principal";
export default ({ IDL }) => {
  return IDL.Service({ whoami: IDL.Func([], [IDL.Principal], ["query"]) });
};

export interface _SERVICE {
  whoami: () => Promise<Principal>;
}
