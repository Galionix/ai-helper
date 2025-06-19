/*
function waitForKeyElements (
    selectorTxt,     Required: The jQuery selector string that
                        specifies the desired element(s).

                        actionFunction, /* Required: The code to run when elements are
                        found. It is passed a jNode to the matched
                        element.

    bWaitOnce,       Optional: If false, will continue to scan for
                        new elements even after the first match is
                        found.

    iframeSelector   Optional: If set, identifies the iframe to
                        search.

)
*/
declare function waitForKeyElements(
  selectorTxt: string,
  actionFunction: (elem: JQuery) => void,
  bWaitOnce?: boolean,
  iframeSelector?: string
): void;

declare function GM_setValue(name: string, value: any): void;
declare function GM_getValue(name: string, defaultValue?: any): any;
declare function GM_addStyle(style: string): any;
