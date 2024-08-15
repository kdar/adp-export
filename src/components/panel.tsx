import { createSignal, onMount } from "solid-js";

declare var angular: any;

const Panel = (props: any) => {
  let [state, setState] = createSignal(0);
  let [scope, setScope] = createSignal<any>({});

  onMount(async () => {
    let $scope = angular.element(document.querySelector("#pay_history")).scope();
    setScope($scope);
  });

  return (
    <a
      class="h6"
      onClick={(e) => {
        e.preventDefault();

        let selected;
        if (state() === 0) {
          selected = true;
          setState(1);
        } else {
          selected = false;
          setState(0);
        }

        for (let x = 0; x < scope().payStatements.length; x++) {
          scope().payStatements[x].selected = selected;
        }

        return false;
      }}
    >Toggle all</a>
  );
};

export default Panel;
